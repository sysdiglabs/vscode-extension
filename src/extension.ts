// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as iacScanner from './runners/iacScanRunner';
import * as vmScanner from './runners/vmScanRunner';
import * as treePolicy from './trees/treePolicy';
import * as treeVulns from './trees/treeVulns';
import * as types from './types';
import { getScannerUrl, getBinaryPath, getScansOutputPath, downloadBinary, storeCredentials } from './config/configScanner';
import { activateCodeLenses, clearDecorations, isKubernetesFile, isSupportedFile, refreshCodeLenses, restoreDecorations, scanDocument, scanKubernetesFile } from './fileScanners';
import { isDockerfile, scanDockerfile, isComposeFile, scanComposeFile } from './fileScanners';

export var vulnTreeDataProvider: treeVulns.VulnTreeDataProvider;
export var policyTreeDataProvider: treePolicy.PolicyTreeDataProvider;
export var outputChannel: vscode.OutputChannel;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Sysdig Scanner');
    context.subscriptions.push(outputChannel);

    const binaryPath = getBinaryPath(context);
    const scansPath = getScansOutputPath(context);
    const binaryUrl = getScannerUrl();

    const vmStatusBar = vmScanner.createVMStatusbarItem();
    vulnTreeDataProvider = treeVulns.activateTree(context);
    policyTreeDataProvider = treePolicy.activateTree(context);

    let error = await downloadBinary(binaryUrl, binaryPath);
    if (error) {
        console.error('Failed to download binary:', error);
        vscode.window.showErrorMessage('Failed to download necessary binaries. Please check your internet connection or try again later.');
        return;
    }

    // Binary downloaded successfully, proceed with initialization
    vscode.window.showInformationMessage('Binary downloaded successfully');

    // Activate CodeLenses for scannable files. This will add the "Scan" CodeLens to Dockerfiles, Kubernetes files, etc.
    context = activateCodeLenses(context);

    /*
     * Store Sysdig Secure credentials
     */
    let authSysdigCmd = vscode.commands.registerCommand('sysdig-vscode-ext.auth', () => {
		let editor = vscode.window.activeTextEditor;
		
		if (editor) {
			storeCredentials(context);
		}
	});

	context.subscriptions.push(authSysdigCmd);

    /*
     * Scan current Workspace
     */
    let scanWorkspaceCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanWorkspace', () => {
        let currentWorkspace = undefined;

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            currentWorkspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            vscode.window.showInformationMessage('No folder is currently opened.');
            return undefined;
        }

        iacScanner.runScan(context, binaryPath, scansPath, currentWorkspace, true);
	});

	context.subscriptions.push(scanWorkspaceCmd);

    /*
     * Scan current Image
     */
    let scanImageCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanImage', async (image? : string, updateTrees? : boolean) : Promise<types.Report | undefined> => {
        let currentWorkspace = undefined;

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            currentWorkspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            vscode.window.showInformationMessage('No folder is currently opened.');
            return undefined;
        }

        return await vmScanner.runScan(context, binaryPath, scansPath, vmStatusBar, image, updateTrees);
    });

    context.subscriptions.push(scanImageCmd);

    let filter_func = async () => {
        const options = [
            { label: 'Exploitable', picked: vulnTreeDataProvider.isFilterEnabled('Exploitable') },
            { label: 'Fix Available', picked: vulnTreeDataProvider.isFilterEnabled('Fix Available') },
        ];

        const selectedOptions = await vscode.window.showQuickPick(options, {
            canPickMany: true,
            placeHolder: 'Select finding to filter'
        });

        if (selectedOptions) {
            const selectedSeverities = selectedOptions.map(option => option.label);
            vulnTreeDataProvider.updateFilters(selectedSeverities);
        }
    };

    let filterVulnTreeCmd = vscode.commands.registerCommand('sysdig-vscode-ext.vuln-tree.filter', filter_func);
    let filterFilledVulnTreeCmd = vscode.commands.registerCommand('sysdig-vscode-ext.vuln-tree.filter-filled', filter_func);

    context.subscriptions.push(filterVulnTreeCmd);
    context.subscriptions.push(filterFilledVulnTreeCmd);


    let openSysdigVulnTreeCmd = vscode.commands.registerCommand('sysdig-vscode-ext.vuln-tree.open-sysdig', async () => {
        const sysdigURL = vulnTreeDataProvider.getBacklink();
        vscode.env.openExternal(vscode.Uri.parse(sysdigURL));
    });

    context.subscriptions.push(openSysdigVulnTreeCmd);

    let scanDockerfileCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanDockerfile', async (document? : vscode.TextDocument, buildAndScanEnabled?: boolean) => {
        if (!document) {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                document = editor.document;
            }
        }
        
        if (document && isDockerfile(document)) {
            scanDockerfile(document, buildAndScanEnabled);
        }
    });

    context.subscriptions.push(scanDockerfileCmd);

    let scanDockerComposeCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanDockerCompose', async (document? : vscode.TextDocument) => {
        if (!document) {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                document = editor.document;
            }
        }
        
        if (document && isComposeFile(document)) {
            scanComposeFile(document);
        }
    });

    context.subscriptions.push(scanDockerComposeCmd);

    let scanKubernetesCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanKubernetes', async (document? : vscode.TextDocument) => {
        if (!document) {
            let editor = vscode.window.activeTextEditor;
            if (editor) {
                document = editor.document;
            }
        }
        
        if (document && isKubernetesFile(document)) {
            scanKubernetesFile(document);
        }
    });

    context.subscriptions.push(scanKubernetesCmd);

    // onSomethingEvent type commands
    vscode.workspace.onDidOpenTextDocument(document => {
        if (isSupportedFile(document)) {
            refreshCodeLenses(document);
        }
    });

    vscode.workspace.onDidChangeTextDocument(event => {
        if (isSupportedFile(event.document)) {
            clearDecorations(event.document);
            refreshCodeLenses(event.document);
        }
    });

    vscode.workspace.onDidSaveTextDocument(document => {
        if (isSupportedFile(document)) {
            refreshCodeLenses(document);
        }
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && isSupportedFile(editor.document)) {
            restoreDecorations(editor.document);
        }
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}