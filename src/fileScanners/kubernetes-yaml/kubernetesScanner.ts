import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Report } from '../../types';
import { highlightImage } from '..';

export const documentId = ['yaml', 'yml'];

// Current limitation: This does not handle multiple manifests in the same file
export async function scanKubernetesFile(document: vscode.TextDocument) {
    const content : any = yaml.load(document.getText());
    let scannedImages: string[] = [];

    let containers : any;
    if (content.kind === 'Deployment') {
        containers = content?.spec?.template?.spec?.containers || [];
    } else if (content.kind === 'Pod') {
        containers = content?.spec?.containers || [];
    } else {
        return;
    }

    for (const container of containers) {
        const image = container.image;

        if (!image || scannedImages.includes(image)) {
            continue;
        }

        let report : Report | undefined = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image, /* updateTrees: */ false);
        
        if (!report) {
            vscode.window.showErrorMessage('Failed to scan image ' + image);
            continue;
        }

        scannedImages.push(image);
        highlightImage(report, document);
    }
}

export function isKubernetesFile(document: vscode.TextDocument) {
    // Structured as an "if" statement to shortcut the evaluation, as loading the YAML content could be time expensive
    if (documentId.includes(document.languageId)) {
        const content : any = yaml.load(document.getText());
        const isValidKind = content.kind === 'Deployment' || content.kind === 'Pod';
        return isValidKind;
    }
    return false;
}