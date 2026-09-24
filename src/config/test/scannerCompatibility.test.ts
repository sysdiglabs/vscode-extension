import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SUPPORTED_ARCH, SUPPORTED_PLATFORMS, SCANNER_VERSION, getScannerUrl, getBinaryPath, downloadBinary } from '../configScanner';
import { buildVMCommand } from '../../runners/vmScanRunner';
import { buildIACCommand } from '../../runners/iacScanRunner';
import * as extension from '../../extension';

// Oldest sysdig-cli-scanner still inside the 1-year support window. Users can point
// cliScannerSource at any version, so the flags we build must keep working on it.
const OLDEST_SCANNER_VERSION : string = '1.23.0'; // oldest-version-marker — DO NOT REMOVE; auto-updated by `just update-oldest-cli-scanner`

function flagsOf(command: string): string[] {
    return [...new Set(command.match(/--[a-z][a-z-]*/g) ?? [])];
}

// Every flag the runners can emit, with all options enabled. Standalone mode drops
// --skipupload, so the VM command is built both ways.
const VM_FLAGS = flagsOf([
    buildVMCommand({ binaryPath: 'bin', secureEndpoint: 'url', imageToScan: 'img', skipUpload: true, skipTLSVerify: true, policies: ['p'] }),
    buildVMCommand({ binaryPath: 'bin', secureEndpoint: 'url', imageToScan: 'img', standolone: true }),
].join(' '));
const IAC_FLAGS = flagsOf(buildIACCommand({ binaryPath: 'bin', secureEndpoint: 'url', pathToScan: 'dir', recursive: true, skipTLSVerify: true }));

function helpOutput(binaryPath: string, args: string[]): string {
    // The scanner exits non-zero on --help; only its output matters here.
    const result = childProcess.spawnSync(binaryPath, args, { encoding: 'utf8' });
    return `${result.stdout}${result.stderr}`;
}

suite('Scanner Compatibility Tests', function () {
    this.timeout(120000);

    const platform = SUPPORTED_PLATFORMS[os.platform()];
    const arch = SUPPORTED_ARCH[os.arch()];

    for (const version of [SCANNER_VERSION, OLDEST_SCANNER_VERSION]) {
        suite(`sysdig-cli-scanner ${version}`, () => {
            let tempDir: string;
            let binaryPath: string;
            let mockStorage : {[key: string]: any};

            suiteSetup(async function () {
                if (!platform || !arch) {
                    this.skip();
                }
                sinon.stub(extension, 'outputChannel').value(vscode.window.createOutputChannel('Sysdig Scanner'));
                mockStorage = {
                    cliScannerSource: `https://download.sysdig.com/scanning/bin/sysdig-cli-scanner/${version}/${platform}/${arch}/sysdig-cli-scanner`
                };
                sinon.stub(vscode.workspace, 'getConfiguration').returns({ get: (key: string) => mockStorage[key] } as any);

                tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
                const context = { globalStorageUri: { fsPath: tempDir } } as unknown as vscode.ExtensionContext;
                binaryPath = getBinaryPath(context);

                const err = await downloadBinary(getScannerUrl(), binaryPath);
                assert.strictEqual(err, null);
            });

            suiteTeardown(() => {
                sinon.restore();
                if (tempDir && fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true });
                }
            });

            test('reports the expected version', () => {
                assert.ok(helpOutput(binaryPath, ['--version']).includes(version));
            });

            test('supports every flag used for VM scans', () => {
                const help = helpOutput(binaryPath, ['--help']);
                const missing = VM_FLAGS.filter(flag => !new RegExp(`${flag}\\b`).test(help));
                assert.deepStrictEqual(missing, []);
            });

            test('supports every flag used for IaC scans', () => {
                const help = helpOutput(binaryPath, ['--iac', '-h']);
                const missing = IAC_FLAGS.filter(flag => !new RegExp(`${flag}\\b`).test(help));
                assert.deepStrictEqual(missing, []);
            });
        });
    }
});
