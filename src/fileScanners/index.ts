import * as vscode from 'vscode';

import { isDockerfile, scanDockerfile } from './Dockerfile/dockerfileScanner';
import * as dockerfile from './Dockerfile/dockerfileScanner';
import { isKubernetesFile, scanKubernetesFile } from './kubernetes-yaml/kubernetesScanner';
import * as kubernetes from './kubernetes-yaml/kubernetesScanner';
import { isComposeFile, scanComposeFile } from './docker-compose/dockercomposeScanner';
import * as dockercompose from './docker-compose/dockercomposeScanner';

import { addDecorations, clearDecorations, restoreDecorations, highlightImage, highlightLayer } from './highlighters';
import { DockerfileCodeLensProvider } from './Dockerfile/DockerfileCodeLensProvider';
import { DockerComposeCodeLensProvider } from './docker-compose/DockerComposeCodeLensProvider';
import { KubernetesCodeLensProvider } from './kubernetes-yaml/KubernetesCodeLensProvider';

const dockerfileCodeLensProvider = new DockerfileCodeLensProvider();
const dockerComposeCodeLensProvider = new DockerComposeCodeLensProvider();
const kubernetesCodeLensProvider = new KubernetesCodeLensProvider();

export function scanDocument(document: vscode.TextDocument) {
    if (document.uri.scheme !== 'file') {
        return;
    }

    if (isDockerfile(document)) {
        scanDockerfile(document);
    } else if (isComposeFile(document)) {
        scanComposeFile(document);
    } else if (isKubernetesFile(document)) {
        scanKubernetesFile(document);
    }
}

export function isSupportedFile(document: vscode.TextDocument): boolean {
    const supportedFileTypes = ['dockercompose', 'dockerfile', 'yaml', 'yml'];
    return supportedFileTypes.includes(document.languageId);
}

export function activateCodeLenses(context: vscode.ExtensionContext) : vscode.ExtensionContext {
    
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: dockerfile.documentId }, dockerfileCodeLensProvider));
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: dockercompose.documentId }, dockerComposeCodeLensProvider));
    for (const documentId of kubernetes.documentId) {
        context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: documentId }, kubernetesCodeLensProvider));
    }
    
    return context;
}

export function refreshCodeLenses(document: vscode.TextDocument) {
    if (isDockerfile(document)) {
        dockerfileCodeLensProvider.refresh();
    } else if (isComposeFile(document)) {
        dockerComposeCodeLensProvider.refresh();
    } else if (isKubernetesFile(document)) {
        kubernetesCodeLensProvider.refresh();
    }
}

export { addDecorations, clearDecorations, restoreDecorations, highlightImage, highlightLayer };
export { isDockerfile, scanDockerfile };
export { isKubernetesFile, scanKubernetesFile };
export { isComposeFile, scanComposeFile };