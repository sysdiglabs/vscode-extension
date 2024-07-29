import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Report } from '../../types';
import { clearDecorations, highlightImage } from '..';

export const documentId = 'dockercompose';

export async function scanComposeFile(document: vscode.TextDocument) {
    const content: any = yaml.load(document.getText());
    let scannedImages: string[] = [];

    // Clear previous highlights for this document
    clearDecorations(document);

    if (content.services) {
        for (const serviceName in content.services) {
            const service = content.services[serviceName];
            const image = service.image;                    // What about service.build? Should we handle duplicate instances of the same image to avoid rescan?
            
            if (!image || scannedImages.includes(image)) {
                continue;
            }

            let report : Report | undefined = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image, /* updateTrees: */ false);
            
            if (!report) {
                vscode.window.showErrorMessage('Failed to scan image ' + image);
                continue;
            }

            scannedImages.push(image);
            highlightImage(report, image, document);
        }
    }
}

export function isComposeFile(document: vscode.TextDocument) {
    return document.languageId === documentId;
}