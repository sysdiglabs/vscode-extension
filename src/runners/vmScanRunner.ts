import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { Report } from '../types';
import { outputChannel, vulnTreeDataProvider, policyTreeDataProvider } from '../extension';
import { checkInternetConnectivity } from '../utils/connectivity';
import { clearDecorations, highlightImage } from '../fileScanners';

const VM_SCAN_FILE = 'vm_scan.json';

interface commandVMOptions {
    binaryPath: string,
    secureEndpoint: string,
    imageToScan: string,
    skipUpload?: boolean,
    skipTLSVerify?: boolean,
    outputJSON?: string,
    dbPath?: string,
    cachePath?: string,
    policies?: Array<string>,
    standolone?: boolean
};

export function createVMStatusbarItem() : vscode.StatusBarItem {
    return vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
}

function buildVMCommand({binaryPath, secureEndpoint, imageToScan, skipUpload = false, skipTLSVerify = false, outputJSON = "-", dbPath = "main.db", cachePath = "cache", policies = [], standolone = false} : commandVMOptions): string {
    let skipUploadOpt = "";
    if (skipUpload) {
        skipUploadOpt = "--skipupload";
    }

    let skipTLSOpt = "";
    if (skipTLSVerify) {
        skipTLSOpt = "--skiptlsverify";
    }

    let standoloneOpt = "";
    if (standolone) {
        standoloneOpt = "--standalone";
        skipUploadOpt = "";              // Standalone mode already skips upload
    }

    let policiesOpt : string = policies.map(policy => `--policy=${policy}`).join(" ");
    return `'${binaryPath}' --apiurl ${secureEndpoint} --dbpath '${dbPath}' --cachepath '${cachePath}' ${policiesOpt} ${skipUploadOpt} ${skipTLSOpt} ${standoloneOpt} --json-scan-result '${outputJSON}' '${imageToScan}' --console-log 2>&1`;
}

export async function runScan(context: vscode.ExtensionContext, binaryPath: string, scansPath: string, statusBar: vscode.StatusBarItem, imageOverride?: string, updateTrees : boolean = true, source?: vscode.TextDocument, range?: vscode.Range) : Promise<Report | undefined> {
    let secureEndpoint : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureEndpoint");
    let secureAPIToken : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureAPIToken");
    const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');

    if (!secureAPIToken || !secureEndpoint) {
        vscode.window.showErrorMessage('Please, authenticate first with your Sysdig Secure API Token and Endpoint.');
        return;
    }

    // Create a temporary directory for every scan. This is done to circumvent the current limitation
    // in the CLI Scanner that can't have multiple scans running at the same time.
    const tempDir = scansPath; //fs.mkdtempSync(`${scansPath}/temp-`);

    // Use the temporary directory in your code
    let outputScanFile : string = `${tempDir}/${VM_SCAN_FILE}`;
    let dbPath : string = `${tempDir}/main.db`;
    let cachePath : string = `${tempDir}/cache`;
    let skipUpload : boolean = !(configuration.get('vulnerabilityManagement.uploadResults') || false);
    let policies : Array<string> = configuration.get('vulnerabilityManagement.addPolicies') || [];
    let imageToScan : string = imageOverride || configuration.get('vulnerabilityManagement.imageToScan') || "";
    let standalone : string = configuration.get('vulnerabilityManagement.standaloneMode') || "Never";

    if (imageToScan.length === 0) {
        imageToScan = await context.secrets.get("sysdig-vscode-ext.secImageToScan") || "";
        imageToScan = await vscode.window.showInputBox({
            prompt: "Enter image pullstring to scan",
            placeHolder: "nginx:latest",
            value: imageToScan,
            ignoreFocusOut: true
        }) ?? "";

        // Sanitize the imageToScan input
        imageToScan = imageToScan.trim();
        imageToScan = imageToScan.replace(/'/g, ""); // Remove single quotes
        imageToScan = imageToScan.replace(/"/g, ""); // Remove double quotes
    }

    await context.secrets.store("sysdig-vscode-ext.secImageToScan", imageToScan);

    if (!imageToScan) {
        console.error("Image Scan is undefined.");
        vscode.window.showErrorMessage('Please, provide an image to scan.');
        return;
    }

    if (standalone === "Always") {
        standalone = "Yes";
    } else if (standalone === "When Disconnected") {
        try {
            await checkInternetConnectivity(secureEndpoint);
        } catch (error) {
            vscode.window.showInformationMessage('Sysdig Scanner: Cannot connect to the internet. Running in standalone mode.');
            standalone = "Yes";
        }
    }

    let command : string = buildVMCommand({
        binaryPath,
        secureEndpoint,
        imageToScan,
        outputJSON: outputScanFile,     // Update this line
        skipUpload: skipUpload,
        dbPath: dbPath,
        cachePath: cachePath,
        policies: policies,
        standolone: standalone === "Yes"
    });

    outputChannel.appendLine(command);

    const loadingBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    loadingBar.text = "$(sync~spin) Scanning image with Sysdig...";
    loadingBar.show();

    return new Promise<Report | undefined>((resolve, reject) => {
        childProcess.exec(command, { env: { ...process.env, SECURE_API_TOKEN: secureAPIToken } }, (error, stdout, stderr) => {
            loadingBar.hide();
            outputChannel.appendLine(stdout);
            if (error?.code && error?.code > 1) {
                vscode.window.showErrorMessage(`Execution error: ${stdout}`);
                reject(error);
            } else {
                // Check if the scan output file is empty
                if (fs.existsSync(outputScanFile) && fs.statSync(outputScanFile).size > 0) {
                    outputChannel.appendLine(outputScanFile);

                    const report = parseScanOutput(statusBar, outputScanFile, updateTrees, source, range);
                    resolve(report);
                } else {
                    console.error("Scan output file is empty or does not exist.");
                    vscode.window.showErrorMessage('Scan output file is empty or does not exist.');
                    reject(new Error("Scan output file is empty or does not exist."));
                }
            }
        });
    });
}

function parseScanOutput(statusBar: vscode.StatusBarItem, outputScanFile: string, updateTrees : boolean = true, source?: vscode.TextDocument, range?: vscode.Range) : Report {
    const scanOutput = fs.readFileSync(outputScanFile, 'utf8');
    const scanData : Report = JSON.parse(scanOutput);
    outputChannel.appendLine(scanOutput);

    if (updateTrees) {
        updateVulnerabilities(statusBar, scanData, source, range);
    }
    return scanData;
}


function updateVulnerabilities(statusBar: vscode.StatusBarItem, report: Report, source?: vscode.TextDocument, range?: vscode.Range) {
    let summary = report.result.vulnTotalBySeverity;

    statusBar.text = `$(shield) C ${summary.critical}  H ${summary.high}  M ${summary.medium}  L ${summary.low}  N ${summary.negligible}`;
    statusBar.show();


    vulnTreeDataProvider.updateVulnTree(report.result.packages, report.info.resultUrl, source, range);
    policyTreeDataProvider.addPolicies(report.result.policyEvaluations || []);
    if (source) {
        if (range) { /* If new highlight range is provided, clear the previous decorations */
            clearDecorations(source);
        } /* If not, just add upon the previous decorations */

        highlightImage(report, source, range);
    }
}
