// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as iacScanner from './runners/iacScanRunner';
import * as vmScanner from './runners/vmScanRunner';
import * as treePolicy from './trees/treePolicy';
import * as treeVulns from './trees/treeVulns';
import * as types from './types';
import { getScannerUrl, getBinaryPath, getScansOutputPath, downloadBinary, storeCredentials } from './config/configScanner';
import { isSupportedFile, scanDocument } from './fileScanners';

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
    let scanImageCmd = vscode.commands.registerCommand('sysdig-vscode-ext.scanImage', async (image? : string) : Promise<types.Report | undefined> => {
        let currentWorkspace = undefined;

        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            currentWorkspace = vscode.workspace.workspaceFolders[0].uri.fsPath;
        } else {
            vscode.window.showInformationMessage('No folder is currently opened.');
            return undefined;
        }

        return await vmScanner.runScan(context, binaryPath, scansPath, vmStatusBar, image);
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


    // onSomethingEvent type commands
    vscode.workspace.onDidOpenTextDocument(document => {
        if (isSupportedFile(document)) {
            console.log('onDidOpenTextDocument', document);
            scanDocument(document);
        }
    });

    vscode.workspace.onDidSaveTextDocument(document => {
        if (isSupportedFile(document)) {
            console.log('onDidSaveTextDocument', document);
            scanDocument(document);
        }
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}