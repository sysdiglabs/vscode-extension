import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { grepString } from '../highlighters';
import { isComposeFile } from './dockercomposeScanner';

export class DockerComposeCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

    public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmitter.event;

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        if (!document || !isComposeFile(document)) {
            return codeLenses;
        }

        let scannedImages: string[] = [];
        
        let command: vscode.Command = {
            title: "$(rocket) Scan Docker Compose",
            command: "sysdig-vscode-ext.scanDockerCompose",
            arguments: [document],
            tooltip: "Scan Docker Compose file for image vulnerabilities"
        };
        codeLenses.push(new vscode.CodeLens(new vscode.Range(0,0,0,0), command));

        const content: any = yaml.load(document.getText());


        if (content.services) {
            for (const serviceName in content.services) {
                const service = content.services[serviceName];
                const image = service.image;                    // What about service.build? Should we handle duplicate instances of the same image to avoid rescan?

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
                            arguments: [image, true, document, range],
                            tooltip: "Scan image for vulnerabilities"
                        };
                        codeLenses.push(new vscode.CodeLens(range, command));
                    }
                }
            }
        }
        return codeLenses;
    }

    public refresh() {
        this.onDidChangeCodeLensesEmitter.fire();
    }
}
