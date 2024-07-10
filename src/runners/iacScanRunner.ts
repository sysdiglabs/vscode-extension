import * as childProcess from 'child_process';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { outputChannel } from '../extension';

const IAC_SCAN_FILE = 'iac_scan.json';

let diagnosticCollection: vscode.DiagnosticCollection;

type Severity =  "low" | "l" | "medium" | "m" | "high" | "h" | "never" | "n" ;

interface commandIACOptions {
    binaryPath: string,
    secureEndpoint: string,
    pathToScan: string,
    recursive?: boolean,
    severityThreshold?: Severity,
    skipTLSVerify?: boolean,
    outputJSON?: string
};

interface ScanData {
    result: {
        findings: Array<{
            severity: string;
            resources: Array<{
                source: string;
                location: string;
                type: string;
                name: string;
            }>;
            name: string;
        }>;
    };
}

function buildIACCommand({binaryPath, secureEndpoint, pathToScan, recursive = false, severityThreshold = 'never', skipTLSVerify = false, outputJSON = "-"} : commandIACOptions): string {
    let recursiveOpt = "";
    if (recursive) {
        recursiveOpt = "--recursive";
    }

    let skipTLSOpt = "";
    if (skipTLSVerify) {
        skipTLSOpt = "--skiptlsverify";
    }

    return `'${binaryPath}' --iac --apiurl ${secureEndpoint} ${recursiveOpt} ${skipTLSOpt} --severity-threshold ${severityThreshold} --output-json '${outputJSON}' ${pathToScan}`;
}

export async function runScan(context: vscode.ExtensionContext, binaryPath: string, scansPath: string, pathToScan?: string, recursive?: boolean) {
    let secureEndpoint : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureEndpoint");
    let secureAPIToken : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureAPIToken");
    let outputScanFile : string = `${scansPath}/${IAC_SCAN_FILE}`;

    if (!secureAPIToken || !secureEndpoint) {
        vscode.window.showErrorMessage('Please, authenticate first with your Sysdig Secure API Token and Endpoint.');
        return;
    }

    if (!pathToScan) {
        console.error("Path to Scan is undefined.");
        return;
    }

    let command : string = buildIACCommand({
        binaryPath,
        secureEndpoint,
        pathToScan,
        recursive,
        outputJSON: outputScanFile
    });

    diagnosticCollection = diagnosticCollection || vscode.languages.createDiagnosticCollection('sysdig-vscode-ext');

    outputChannel.appendLine(command);

    const loadingBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    loadingBar.text = "$(sync~spin) Scanning with Sysdig...";
    loadingBar.show();

    childProcess.exec(command, { cwd: pathToScan, env: {SECURE_API_TOKEN: secureAPIToken} }, (error, stdout, stderr) => {
        loadingBar.hide();
        if (error) {
            console.error(`exec error: ${error}`);
            vscode.window.showErrorMessage(`Execution error: ${error}`);
            return;
        } else {
            loadingBar.text = "$(sync~spin) Adding Sysdig findings...";
            loadingBar.show();

            // Check if the scan output file is empty
            if (fs.existsSync(outputScanFile) && fs.statSync(outputScanFile).size > 0) {
                let diagnostics: { [key: string]: vscode.Diagnostic[] } = parseScanOutput(outputScanFile);
                Object.entries(diagnostics).forEach(([key, value]) => {
                    const uri = vscode.Uri.file(pathToScan + key);
                    // Add the diagnostics to the collection for each file
                    diagnosticCollection.set(uri, value);
                });

                // Show the diagnostics in the Problems panel
                vscode.commands.executeCommand('workbench.action.problems.focus');

            } else {
                console.error("Scan output file is empty or does not exist.");
                vscode.window.showErrorMessage('Scan output file is empty or does not exist.');
            }
            loadingBar.hide();
        }
    });
}

function parseScanOutput(outputScanFile: string): { [key: string]: vscode.Diagnostic[] } {
    const diagnosticsMap: { [key: string]: vscode.Diagnostic[] } = {};
    const scanOutput = fs.readFileSync(outputScanFile, 'utf8');
    const scanData : ScanData = JSON.parse(scanOutput);
    outputChannel.appendLine(scanOutput);

    const severityMap: { [key: string]: vscode.DiagnosticSeverity } = {
        "high": vscode.DiagnosticSeverity.Error,
        "medium": vscode.DiagnosticSeverity.Warning,
        "low": vscode.DiagnosticSeverity.Information
    };

    for (const finding of scanData.result.findings) {
        const severity = severityMap[finding.severity.toLowerCase()];
        for (const resource of finding.resources) {
            const message = finding.name + ": " + resource.location + " (" + resource.type + ": " + resource.name + ")";
            const diagnostic = new vscode.Diagnostic(new vscode.Range(0,0,0,0), message, severity);
            if (!diagnosticsMap[resource.source]) {
                diagnosticsMap[resource.source] = [];
            }
            diagnosticsMap[resource.source].push(diagnostic);
        }
    }

    return diagnosticsMap;
}
