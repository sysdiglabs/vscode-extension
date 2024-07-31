import * as vscode from 'vscode';
import { createMarkdownSummary, Layer, Report } from '../types';
import { Instruction } from 'dockerfile-ast';
import { createMarkdownVulnsForLayer } from '../types/report';
import { getLineFromDockerfile, isDockerfile } from './Dockerfile/dockerfileScanner';

interface DecorationsMap {
    [key: string]: [
        {
            decorationType: vscode.TextEditorDecorationType,
            decorations: vscode.DecorationOptions[]
        }
    ]
}

export let decorationsMap : DecorationsMap = {};

export function addDecorations(document: vscode.TextDocument, decorations: vscode.DecorationOptions[], decorationType: vscode.TextEditorDecorationType) {
    const decorationsArray = decorationsMap[document.uri.toString()];
    if (decorationsArray && decorationsArray.length > 0) {
        decorationsArray.push({ decorationType, decorations });
    } else {
        decorationsMap[document.uri.toString()] = [{ decorationType, decorations }];
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    editor.setDecorations(decorationType, decorations);
}

export function restoreDecorations(document: vscode.TextDocument) {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    const decorationsArray = decorationsMap[document.uri.toString()];
    if (decorationsArray && decorationsArray.length > 0) {
        decorationsArray.forEach(({ decorationType, decorations }) => {
            editor.setDecorations(decorationType, decorations);
        });
    }
}

export function clearDecorations(document: vscode.TextDocument) {
    let decorationsArray = decorationsMap[document.uri.toString()];
    delete decorationsMap[document.uri.toString()];
    
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== document) return;

    if (decorationsArray && decorationsArray.length > 0) {
        decorationsArray.forEach(({ decorationType }) => {
            editor.setDecorations(decorationType, []);
        });

    }
}

export function highlightImage(report: Report, image: string, document: vscode.TextDocument) {
    let matches: vscode.Range[] = grepString(document, image) || [];

    const decorations: vscode.DecorationOptions[] = matches.flatMap(range => {
        let decorationOptions : vscode.DecorationOptions = {
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

    addDecorations(document, decorations, decorationType);
}

export function highlightLayer(report: Report, instructions : Instruction[], document: vscode.TextDocument) {
    const layers = report.result.layers || [];
    let instructionIndex = instructions.length - 1;
    let layerIndex = layers.length - 1;
    let decorations : vscode.DecorationOptions[] = [];

    clearDecorations(document);

    while (instructionIndex >= 0 && layerIndex >= 0) {
        const instruction = instructions[instructionIndex];
        const layer = layers[layerIndex];

        // Skip FROM instructions as base image is already scanned
        if (instruction.getInstruction() === 'FROM') {
            instructionIndex = -1;
            break;
        }

        // Could this check be improved to ensure these instructions correspond?
        // Scan results layer commands are not always the same as the Dockerfile instructions in arguments
        //   - scan result:         RUN /bin/sh -c echo 'print(\"hello world!\")' \u003e /tmp/hello.py # buildkit
        //       vs
        //   - actual instruction:  RUN echo 'print("hello world!")' > /tmp/hello.py
        if (layer.command.includes(instruction.getInstruction())) {
            instructionIndex--;
            layerIndex--;
        } else {
            layerIndex--; // Assume that if the commands don't match, this layer is not relevant
            continue;
        }

        if (layer.vulns) {
            let contentText = '';

            if (layer.vulns.critical > 0) {
                contentText += ` 🟣 ${layer.vulns.critical}  `;
            }
            if (layer.vulns.high > 0) {
                contentText += ` 🔴 ${layer.vulns.high}  `;
            }
            if (layer.vulns.medium > 0) {
                contentText += ` 🟠 ${layer.vulns.medium}  `;
            }
            if (layer.vulns.low > 0) {
                contentText += ` 🟡 ${layer.vulns.low}  `;
            }
            if (layer.vulns.negligible > 0) {
                contentText += ` ⚪ ${layer.vulns.negligible}  `;
            }

            let decorationOptions : vscode.DecorationOptions = {
                range: instruction.getRange() as vscode.Range,
                hoverMessage: createMarkdownVulnsForLayer(layer, report),
                renderOptions: {
                    after: {
                        contentText: contentText,
                        color: 'gray',
                        margin: '0 0 0 20px'
                    }
                }
            };

            decorations.push(decorationOptions);
        }
    }

    const decorationType = vscode.window.createTextEditorDecorationType({
        overviewRulerColor: 'purple',
        overviewRulerLane: vscode.OverviewRulerLane.Right,
    });

    addDecorations(document, decorations, decorationType);
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

export function getSourceLine(document: vscode.TextDocument, layers: Layer[], wantedDigest : string) : vscode.Range | undefined {
    if (isDockerfile(document)) {
        return getLineFromDockerfile(document, layers, wantedDigest);
    }
    return undefined;
}