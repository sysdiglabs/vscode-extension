import os from 'os';
import vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { outputChannel } from '../extension';
import { IncomingMessage } from 'http';


export const SUPPORTED_PLATFORMS : { [key: string]: string } = {
    'darwin': 'darwin',
    'linux': 'linux'
};

export const SUPPORTED_ARCH : { [key: string]: string } = {
    'x64': 'amd64',
    'arm64': 'arm64'
};

const SCANNER_VERSION : string = '1.11.0';
const SCANNER_BASE_URL : string = 'https://download.sysdig.com/scanning/bin/sysdig-cli-scanner/';
const SCANNER_BINARY_NAME : string = 'sysdig-cli-scanner';

export function getScannerUrl() {
    const configuration = vscode.workspace.getConfiguration('sysdig-vscode-ext');
    let url : string = configuration.get('cliScannerSource') || "";

    if (url.length === 0) {
        let platform = os.platform();
        let arch = os.arch();
    
        if (platform in SUPPORTED_PLATFORMS && arch in SUPPORTED_ARCH) {
            outputChannel.appendLine(`Sysdig IaC Scanner IS available for ${platform}/${arch}`);
            url = SCANNER_BASE_URL + SCANNER_VERSION + "/" + SUPPORTED_PLATFORMS[platform] + "/" + SUPPORTED_ARCH[arch] + "/" + SCANNER_BINARY_NAME;
        } else {
            vscode.window.showErrorMessage(`Sysdig CLI Scanner NOT available for ${platform}/${arch}`);
        }
    }

    return url;
};

export function getBinaryPath(context: vscode.ExtensionContext): string {
    const globalPath = context.globalStorageUri.fsPath;
    if (!fs.existsSync(globalPath)){
        fs.mkdirSync(globalPath, { recursive: true });
    }
    const binPath = path.join(globalPath, SCANNER_BINARY_NAME);
    return binPath;
}

export function getScansOutputPath(context: vscode.ExtensionContext): string {
    // Use Workspace if available, otherwise use Global Storage
    const globalPath = context.storageUri?.fsPath || context.globalStorageUri.fsPath;
    if (!fs.existsSync(globalPath)){
        fs.mkdirSync(globalPath, { recursive: true });
    }
    const scansPath = path.join(globalPath, 'scans');
    if (!fs.existsSync(scansPath)){
        fs.mkdirSync(scansPath, { recursive: true });
    }
    return scansPath;
}

export function binaryExists(binaryPath: string): boolean {
    // TODO - Check if existing binary matches versions - use sha256
    return fs.existsSync(binaryPath);
}

export async function downloadBinary(binaryUrl: string, binaryPath: string) : Promise<Error | null> {
    if (binaryExists(binaryPath)) {
        outputChannel.appendLine('Binary already exists. No download needed.');
        return null;
    }

    const file = fs.createWriteStream(binaryPath);

    vscode.window.showInformationMessage('Downloading Sysdig CLI Scanner...');

    return await new Promise((resolve, reject) => {
        https.get(binaryUrl, (response) => {
            // Check if the request was successful
            if (response.statusCode === 200) {
                response.pipe(file);
            } else {
                file.close();
                fs.unlink(binaryPath, () => {}); // Delete the file async. (No need to check for errors)
                reject(new Error(`Server responded with ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            file.on('finish', () => {
                file.close(); // close() is async, call cb after close completes.
                fs.chmodSync(binaryPath, 0o755);
                resolve(null);
            });

            file.on('error', (err) => { // Handle errors on write stream
                fs.unlink(binaryPath, () => {}); // Delete the file on error async. (No need to check for errors)
                reject(err);
            });

        }).on('error', (err) => {
            reject(err);
        });
    });
}

export async function storeCredentials(context: vscode.ExtensionContext) {
    let secureEndpoint : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureEndpoint");
    secureEndpoint = await vscode.window.showInputBox({
        prompt: "Enter your Sysdig Secure Endpoint",
        placeHolder: "https://secure.sysdig.com/",
        value: secureEndpoint,
        ignoreFocusOut: true
    }) ?? "";

    // Sanitize the secureEndpoint input
    secureEndpoint = secureEndpoint.trim();
    secureEndpoint = secureEndpoint.replace(/'/g, ""); // Remove single quotes
    secureEndpoint = secureEndpoint.replace(/"/g, ""); // Remove double quotes;

    let secureAPIToken : string | undefined = await context.secrets.get("sysdig-vscode-ext.secureAPIToken");
    secureAPIToken = await vscode.window.showInputBox({
        prompt: "Enter your Sysdig Secure API Token",
        placeHolder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        value: secureAPIToken,
        ignoreFocusOut: true
    }) ?? "";

    // Sanitize the secureAPIToken input
    secureAPIToken = secureAPIToken.trim();
    secureAPIToken = secureAPIToken.replace(/'/g, ""); // Remove single quotes
    secureAPIToken = secureAPIToken.replace(/"/g, ""); // Remove double quotes;

    if (!secureAPIToken || !secureEndpoint) {
        throw new Error("Missing Sysdig Secure API Token or Endpoint");
    }

    await context.secrets.store("sysdig-vscode-ext.secureEndpoint", secureEndpoint);
    await context.secrets.store("sysdig-vscode-ext.secureAPIToken", secureAPIToken);
}