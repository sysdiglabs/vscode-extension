import { DockerfileParser } from 'dockerfile-ast';
import * as vscode from 'vscode';
import { isDockerfile } from './dockerfileScanner';

export class DockerfileCodeLensProvider implements vscode.CodeLensProvider {
    private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

    public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmitter.event;

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];

        if (!document || !isDockerfile(document)) {
            return codeLenses;
        }

        let doctext : string = document.getText();
        const dockerfile = DockerfileParser.parse(doctext);

        let baseImage: string | undefined;
        let range: vscode.Range;
        const instructions = dockerfile.getInstructions();
        for (let i = instructions.length - 1; i >= 0; i--) {
            const instruction = instructions[i];
            if (instruction.getInstruction() === 'FROM') {
                range = instruction.getRange() as vscode.Range;
                baseImage = instruction.getArguments().at(0)?.toString();
                
                let command: vscode.Command = {
                    title: "$(rocket) Build and Scan",
                    command: "sysdig-vscode-ext.scanDockerfile",
                    arguments: [document],
                    tooltip: "Build Dockerfile and scan for vulnerabilities"
                };
                codeLenses.push(new vscode.CodeLens(range, command));


                command = {
                    title: "$(beaker) Scan Base Image",
                    command: "sysdig-vscode-ext.scanImage",
                    arguments: [baseImage, true, document, range],
                    tooltip: "Scan base image for vulnerabilities"
                };
                codeLenses.push(new vscode.CodeLens(range, command));

                break;
            }
        }
        return codeLenses;
    }

    public refresh() {
        this.onDidChangeCodeLensesEmitter.fire();
    }
}
