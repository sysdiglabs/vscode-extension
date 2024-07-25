import * as vscode from 'vscode';
import { DockerfileParser } from 'dockerfile-ast';
import { getLayer, Layer, Report } from '../types';

export function scanDockerfile(document: vscode.TextDocument) {
    const dockerfile = DockerfileParser.parse(document.getText());

    for (const instruction of dockerfile.getInstructions().reverse()) {
        // if (instruction.getInstruction() === 'FROM') {
        //     const image = instruction.getArguments().join(' ');
        //     vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image);
        // }
    }
    const vulnerabilities = dockerfile.getInstructions().map((instruction: any) => {
        return getVulnerabilitiesForLayer(instruction.toString());
    });
    highlightVulnerabilities(vulnerabilities, document);
}

export function highlightVulnerabilities(report: Report, document: vscode.TextDocument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    const decorations: vscode.DecorationOptions[] = report.result.packages.flatMap(pkg => {
        const layer: Layer | undefined = getLayer(report, pkg.layerDigest);
        if (pkg.vulns && pkg.layerDigest && layer?.command) {
            return pkg.vulns.map(vuln => {
                return {
                    range: grepString(document, layer?.command),
                    hoverMessage: `**Vulnerability**:\n- ${vuln.name} (${vuln.severity.value})`
                } as vscode.DecorationOptions;
            });
        }
        return [];
    });

    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255,0,0,0.3)'
    });

    editor.setDecorations(decorationType, decorations);
}

export function grepString(document: vscode.TextDocument, searchString: string): vscode.Range | undefined {
    const text = document.getText();
    const regex = new RegExp(searchString, 'g');
    let match;
    while ((match = regex.exec(text))) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        return range;
    }
    return undefined;
}