import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SUPPORTED_ARCH, SUPPORTED_PLATFORMS, getScannerUrl, getBinaryPath, getScansOutputPath, binaryExists, downloadBinary, storeCredentials } from '../configScanner';
import * as extension from '../../extension';

suite('ConfigScanner Tests', () => {
    let tempDir: string;
    let testUri: vscode.Uri;
    let testFsPath: fs.PathLike;
    let testFilePath : string;
    let testFileUri : vscode.Uri;
    let testFileFsPath : fs.PathLike;
    let variableStub: sinon.SinonStub;
    let getConfigurationStub : sinon.SinonStub;
    let config : any;
    let mockStorage : {[key: string]: any} = {};

    setup(function () {
        // Create a test path and Uri
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        testUri = vscode.Uri.file(tempDir);
        testFsPath = testUri.fsPath;
        variableStub = sinon.stub(extension, 'outputChannel').value(vscode.window.createOutputChannel('Sysdig Scanner'));
        
        // Create a test file path and file Uri
        testFilePath = path.join(tempDir, 'test-file');
        testFileUri = vscode.Uri.file(testFilePath);
        testFileFsPath = testFileUri.fsPath;
        fs.writeFileSync(testFileFsPath, 'File contents');
        
        // Create a fake configuration object
        mockStorage = {};
        config = {
            get: (key: string) : any => {
                return mockStorage[key];
            },
            update: (key: string, value: any, target: vscode.ConfigurationTarget) => {
                mockStorage[key] = value;
            }
        };

        // Stub the getConfiguration method
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns(config);
    });

    teardown(function () {
        // Clean up the test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
        
        if (fs.existsSync(testFsPath)) {
            fs.rmSync(testFsPath, { recursive: true });
        }
        variableStub.restore();
        sinon.restore();
        getConfigurationStub.restore();
    });

    suiteTeardown(function () {
        // Remove the temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true });
        }
    });

    test('getScannerUrl should return the correct URL when cliScannerSource is not set', () => {
        const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');
        configuration.update('cliScannerSource', undefined, vscode.ConfigurationTarget.Global);
        const url = getScannerUrl();
        assert.strictEqual(url, `https://download.sysdig.com/scanning/bin/sysdig-cli-scanner/1.11.0/${SUPPORTED_PLATFORMS[os.platform()]}/${SUPPORTED_ARCH[os.arch()]}/sysdig-cli-scanner`);
    });

    test('getScannerUrl should return the correct URL when cliScannerSource is set', () => {
        const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');
        configuration.update('cliScannerSource', 'https://example.com/sysdig-cli-scanner', vscode.ConfigurationTarget.Workspace);
        let url : string = configuration.get('cliScannerSource') || "";
        assert.strictEqual(url, 'https://example.com/sysdig-cli-scanner');

        url = getScannerUrl();
        assert.strictEqual(url, 'https://example.com/sysdig-cli-scanner');
    });

    test('getBinaryPath should return the correct binary path', () => {
        const context: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalStorageUri: {
                fsPath: testFsPath
            }
        } as unknown as vscode.ExtensionContext;

        const binaryPath = getBinaryPath(context);
        assert.strictEqual(binaryPath, `${tempDir}/sysdig-cli-scanner`);
    });

    test('getScansOutputPath should return the correct scans output path', () => {
        const context: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalStorageUri: {
                fsPath: testFsPath
            }
        } as unknown as vscode.ExtensionContext;
        const scansOutputPath = getScansOutputPath(context);
        assert.strictEqual(scansOutputPath, `${tempDir}/scans`);
    });

    test('binaryExists should return true when the binary file exists', () => {
        const binaryPath = testFilePath;
        const exists = binaryExists(binaryPath);
        assert.strictEqual(exists, true);
    });

    test('binaryExists should return false when the binary file does not exist', () => {
        const binaryPath = path.join(tempDir, 'test-does-not-exist-file');
        const exists = binaryExists(binaryPath);
        assert.strictEqual(exists, false);
    });

    test('downloadBinary should download the binary file when it does not exist', async () => {
        const binaryUrl = getScannerUrl();
        const binaryPath = tempDir + '/sysdig-cli-scanner';

        let err = await downloadBinary(binaryUrl, binaryPath);

        assert.strictEqual(binaryExists(binaryPath), true);
        assert.strictEqual(err, null);
    });

    test('downloadBinary should not download the binary file when it already exists', async () => {
        const binaryUrl = getScannerUrl();
        const binaryPath = testFilePath;

        let err = await downloadBinary(binaryUrl, binaryPath);

        assert.strictEqual(binaryExists(binaryPath), true);
        assert.strictEqual(err, null);
    });

    test('storeCredentials should store the secureEndpoint and secureAPIToken', async () => {
        const context: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalStorageUri: {
                fsPath: testFsPath
            },
            secrets: {
                get: (key: string) : any => {
                    return mockStorage[key];
                },
                store: (key: string, value: any, target: vscode.ConfigurationTarget) => {
                    mockStorage[key] = value;
                }
            },
        } as unknown as vscode.ExtensionContext;
        
        let showInputBoxStub = sinon.stub(vscode.window, 'showInputBox')
            .onFirstCall().resolves('https://secure.sysdig.com/')
            .onSecondCall().resolves('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        
        await storeCredentials(context);
    
        assert.strictEqual(showInputBoxStub.callCount, 2);
        assert.strictEqual(await showInputBoxStub.returnValues[0], 'https://secure.sysdig.com/');
        assert.strictEqual(await showInputBoxStub.returnValues[1], 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');

        let secureEndpoint = await context.secrets.get('sysdig-vscode-ext.secureEndpoint');
        let secureAPIToken = await context.secrets.get('sysdig-vscode-ext.secureAPIToken');
        assert.strictEqual(secureEndpoint, 'https://secure.sysdig.com/');
        assert.strictEqual(secureAPIToken, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });

    test('storeCredentials should throw an error when secureEndpoint or secureAPIToken is missing', async () => {
        const context: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalStorageUri: {
                fsPath: testFsPath
            },
            secrets: {
                get: (key: string) : any => {
                    return mockStorage[key];
                },
                store: (key: string, value: any, target: vscode.ConfigurationTarget) => {
                    mockStorage[key] = value;
                }
            },
        } as unknown as vscode.ExtensionContext;
        
        let showInputBoxStub = sinon.stub(vscode.window, 'showInputBox')
            .onFirstCall().resolves('')
            .onSecondCall().resolves('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        
        await assert.rejects(async () => {
            await storeCredentials(context);
        }, new Error('Missing Sysdig Secure API Token or Endpoint'));
    
        assert.strictEqual(showInputBoxStub.callCount, 2);
        assert.strictEqual(await showInputBoxStub.returnValues[0], '');
        assert.strictEqual(await showInputBoxStub.returnValues[1], 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });
});
