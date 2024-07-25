import * as vscode from 'vscode';
import { scanDockerfile } from './dockerfileScanner';
import { scanContainerfile } from './containerfileScanner';
import { scanKubernetesFile } from './kubernetesScanner';
import { scanComposeFile } from './composeFileScanner';

export function scanDocument(document: vscode.TextDocument) {
    if (document.languageId === 'dockerfile') {
        scanDockerfile(document);
    } else if (document.fileName.endsWith('Containerfile')) {
        scanContainerfile(document);
    } else if (document.languageId === 'yaml' || document.languageId === 'yml') {
        scanKubernetesFile(document);
    } else if (document.languageId === 'dockercompose') {
        scanComposeFile(document);
    }
}

export function isSupportedFile(document: vscode.TextDocument): boolean {
    const supportedFileTypes = ['dockercompose', 'dockerfile', 'yaml', 'yml'];
    return supportedFileTypes.includes(document.languageId) || document.fileName.endsWith('Containerfile');
}