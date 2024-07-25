import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Report, createMarkdownSummary } from '../types';

// Store the decorations for each editor
const decorationsMap = new Map<string, vscode.TextEditorDecorationType>();

export async function scanComposeFile(document: vscode.TextDocument) {
    const content: any = yaml.load(document.getText());

    // Clear previous highlights for this document
    clearDecorations(document);

    if (content.services) {
        for (const serviceName in content.services) {
            const service = content.services[serviceName];
            const image = service.image;                    // What about service.build? Should we handle duplicate instances of the same image to avoid rescan?
            let report : Report | undefined = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image);
            
            if (!report) {
                vscode.window.showErrorMessage('Failed to scan image ' + image);
                continue;
            }

            highlightVulnerabilities(report, image, document);
        }
    }
}

export function highlightVulnerabilities(report: Report, image: string, document: vscode.TextDocument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    let matches: vscode.Range[] = grepString(document, image) || [];

    const decorations: vscode.DecorationOptions[] = matches.flatMap(range => {
        let decorationOptions : vscode.DecorationOptions = 
         {
            range: range,
            hoverMessage: createMarkdownSummary(report),
        };

        if (report.result.policyEvaluations) {
            let failedPolicies = report.result.policyEvaluations.filter(policy => policy.evaluationResult === "failed");
            let totalPolicies = report.result.policyEvaluations;
            decorationOptions.renderOptions = {
                after: {
                    contentText: ` Failed Policies: (${failedPolicies.length}/${totalPolicies.length})`,
                    color: 'red',
                    margin: '0 0 0 20px'
                }
            }
        }

        return decorationOptions;
    });

    const decorationType = vscode.window.createTextEditorDecorationType({
        border: '1px solid green',
        borderRadius: '2px',
        borderStyle: 'dashed',
        overviewRulerColor: 'green',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
        gutterIconPath: '$(error)',
        gutterIconSize: 'contain'
    });

    editor.setDecorations(decorationType, decorations);
    decorationsMap.set(document.uri.toString(), decorationType);
}

export function grepString(document: vscode.TextDocument, searchString: string): vscode.Range[] | undefined {
    const text = document.getText();
    const regex = new RegExp(searchString, 'g');
    let matches: vscode.Range[] = [];
    let match;
    while ((match = regex.exec(text))) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        matches.push(range);
    }
    return matches;
}

export function clearDecorations(document: vscode.TextDocument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    const decorationType = decorationsMap.get(document.uri.toString());
    if (decorationType) {
        editor.setDecorations(decorationType, []);
        decorationsMap.delete(document.uri.toString());
    }
}