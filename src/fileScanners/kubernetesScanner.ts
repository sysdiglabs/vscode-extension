import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Report } from '../types';
import { highlightVulnerabilities } from './composeFileScanner';

export async function scanKubernetesFile(document: vscode.TextDocument) {
    const content : any = yaml.load(document.getText());
    if (content.kind === 'Deployment' || content.kind === 'Pod') {
        const containers = content.spec.template.spec.containers;
        for (const container of containers) {
            const image = container.image;
            let report : Report | undefined = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image);
            
            if (!report) {
                vscode.window.showErrorMessage('Failed to scan image ' + image);
                continue;
            }

            highlightVulnerabilities(report, image, document);
        }
    }
}