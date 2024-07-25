import * as vscode from 'vscode';
import { scanDockerfile } from './dockerfileScanner';

export function scanContainerfile(document: vscode.TextDocument) {
    scanDockerfile(document);
}