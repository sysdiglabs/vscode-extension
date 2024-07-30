import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { grepString } from '../highlighters';
import { isKubernetesFile } from './kubernetesScanner';

export class KubernetesCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

    public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmitter.event;

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        if (!document || !isKubernetesFile(document)) {
            return codeLenses;
        }

        let scannedImages: string[] = [];
        
        let command: vscode.Command = {
            title: "$(rocket) Scan manifest",
            command: "sysdig-vscode-ext.scanKubernetes",
            arguments: [document],
            tooltip: "Scan Kubernetes manifest for image vulnerabilities (in Pods or Deployments)"
        };
        codeLenses.push(new vscode.CodeLens(new vscode.Range(0,0,0,0), command));

        const content: any = yaml.load(document.getText());
        let containers : any;
        if (content.kind === 'Deployment') {
            containers = content?.spec?.template?.spec?.containers || [];
        } else if (content.kind === 'Pod') {
            containers = content?.spec?.containers || [];
        } else {
            return codeLenses;
        }

        for (const container of containers) {
            const image = container.image;

            if (!image || scannedImages.includes(image)) {
                continue;
            }

            scannedImages.push(image);
            let ranges : vscode.Range[] | undefined = grepString(document, image);

            if (ranges) {
                for (const range of ranges) {
                    command = {
                        title: "$(beaker) Scan Image",
                        command: "sysdig-vscode-ext.scanImage",
                        arguments: [image],
                        tooltip: "Scan image for vulnerabilities"
                    };
                    codeLenses.push(new vscode.CodeLens(range, command));
                }
            }
        }
        
        return codeLenses;
    }

    public refresh() {
        this.onDidChangeCodeLensesEmitter.fire();
    }
}
