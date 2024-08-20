import * as vscode from 'vscode';
import * as yaml from '../../utils/yaml';
import { isKubernetesFile } from './kubernetesScanner';


export class KubernetesCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

    public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmitter.event;

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        if (!document || !isKubernetesFile(document)) {
            return codeLenses;
        }

        let command: vscode.Command = {
            title: "$(rocket) Scan manifest",
            command: "sysdig-vscode-ext.scanKubernetes",
            arguments: [document],
            tooltip: "Scan Kubernetes manifest for image vulnerabilities (in Pods or Deployments)"
        };
        codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));

        let imagesAndRanges = yaml.extractImagesAndRanges(document);
        for (const imageWithRange of imagesAndRanges) {
            command = {
                title: "$(beaker) Scan Image",
                command: "sysdig-vscode-ext.scanImage",
                arguments: [imageWithRange.image, true, document, imageWithRange.range],
                tooltip: "Scan image for vulnerabilities"
            };
            codeLenses.push(new vscode.CodeLens(imageWithRange.range, command));
        }

        return codeLenses;
    }

    public refresh() {
        this.onDidChangeCodeLensesEmitter.fire();
    }
}
