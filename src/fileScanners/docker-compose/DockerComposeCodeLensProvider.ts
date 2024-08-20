import * as vscode from 'vscode';
import * as yaml from '../../utils/yaml';
import { isComposeFile } from './dockercomposeScanner';

export class DockerComposeCodeLensProvider implements vscode.CodeLensProvider {
  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  public readonly onDidChangeCodeLenses: vscode.Event<void> = this.onDidChangeCodeLensesEmitter.event;

  public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];

    if (!document || !isComposeFile(document)) {
      return codeLenses;
    }

    let command: vscode.Command = {
      title: "$(rocket) Scan Docker Compose",
      command: "sysdig-vscode-ext.scanDockerCompose",
      arguments: [document],
      tooltip: "Scan Docker Compose file for image vulnerabilities"
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));

    const imagesAndRanges = yaml.extractImagesAndRanges(document);
    for (const {image, range} of imagesAndRanges) {
      command = {
        title: "$(beaker) Scan Image",
        command: "sysdig-vscode-ext.scanImage",
        arguments: [image, true, document, range],
        tooltip: "Scan image for vulnerabilities"
      };
      codeLenses.push(new vscode.CodeLens(range, command));
    }
    return codeLenses;
  }

  public refresh() {
    this.onDidChangeCodeLensesEmitter.fire();
  }
}
