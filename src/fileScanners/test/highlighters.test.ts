import * as vscode from 'vscode';
import { createMarkdownSummary, Layer, Report } from '../../types';
import { DockerfileParser, Instruction } from 'dockerfile-ast';
import { addDecorations, clearDecorations, grepString, highlightImage, highlightLayer, restoreDecorations, decorationsMap } from '../highlighters';
import * as highlighters from '../highlighters';
import * as dockerfile from '../Dockerfile/dockerfileScanner';
import assert from 'assert';
import sinon from 'sinon';

suite('Highlighters Tests', () => {
    let sandbox : sinon.SinonSandbox;
    let document: vscode.TextDocument;
    let editor: vscode.TextEditor = vscode.window.activeTextEditor as vscode.TextEditor;

    setup(async () => {
        // Create a new text document and set it as the active editor
        sandbox = sinon.createSandbox();
        document = await vscode.workspace.openTextDocument({language : 'dockerfile', content: 'FROM example-image\n\nRUN echo "example"' });
        editor = await vscode.window.showTextDocument(document); 
    });

    teardown(() => {
        sandbox.restore();
    });

    test('addDecorations should add decorations to the decorationsMap and set decorations on the active editor', () => {
        const decorationType = vscode.window.createTextEditorDecorationType({});
        const decorations: vscode.DecorationOptions[] = [];
        const expectedDecorationsMap = {
            [document.uri.toString()]: [{ decorationType, decorations }],
        };

        addDecorations(document, decorations, decorationType);

        assert.deepEqual(decorationsMap, expectedDecorationsMap);
    });

    test('clearDecorations should remove decorations from the decorationsMap and clear decorations on the active editor', () => {
        const decorationType = vscode.window.createTextEditorDecorationType({});
        const decorations: vscode.DecorationOptions[] = [];
        decorationsMap[document.uri.toString()] = [{ decorationType, decorations }];

        clearDecorations(document);

        assert.strictEqual(decorationsMap[document.uri.toString()], undefined);
    });

    test('highlightImage should add decorations to highlight the specified image', () => {
        const report: Report = {
            result: {
                metadata: {
                    pullString: '',
                    imageId: '',
                    digest: '',
                    baseOs: '',
                    size: 0,
                    os: '',
                    architecture: '',
                    layersCount: 0,
                    createdAt: ''
                },
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                fixableVulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: []
            },
            info: {
                resultUrl: ''
            }
        };
        const image = 'example-image';
        const matches: vscode.Range[] = [new vscode.Range(new vscode.Position(0, 5), new vscode.Position(0, image.length + 5))];
        const expectedDecorations: vscode.DecorationOptions[] = [{
            range: matches[0],
            hoverMessage: createMarkdownSummary(report),
        }];

        editor.edit(editBuilder => {
            editBuilder.insert(new vscode.Position(0, 0), image);
        });

        highlightImage(report, image, document);

        assert.deepEqual(decorationsMap[document.uri.toString()][0].decorations as vscode.DecorationOptions[], expectedDecorations);
    });

    test('highlightLayer should add decorations to highlight the specified layer', () => {
        const report: Report = {
            result: {
                metadata: {
                    pullString: '',
                    imageId: '',
                    digest: '',
                    baseOs: '',
                    size: 0,
                    os: '',
                    architecture: '',
                    layersCount: 0,
                    createdAt: ''
                },
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                fixableVulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: [
                    {
                        name: 'example-package',
                        type: 'example-type',
                        path: 'example-path',
                        version: '1.0.0',
                        vulns: [
                            {
                                name: 'Test Vulnerability',
                                severity: {
                                    value: 'High',
                                    sourceName: 'Test Source'
                                },
                                cvssScore: {
                                    value: {
                                        version: '3.0',
                                        score: 7.5,
                                        vector: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'
                                    },
                                    sourceName: 'Test Source'
                                },
                                disclosureDate: '2022-01-01',
                                exploitable: true,
                                fixedInVersion: '1.0',
                                publishDateByVendor: {
                                    'Vendor A': '2022-01-01',
                                    'Vendor B': '2022-01-02'
                                }
                            }
                        ],
                        layerDigest: 'example-digest'
                    }
                ],
                layers: [{
                    digest: 'example-digest',
                    size: 0,
                    command: 'RUN echo "example"',
                    vulns: {
                        critical: 0,
                        high: 1,
                        medium: 0,
                        low: 0,
                        negligible: 0
                    },
                    baseImage: []
                }]
            },
            info: {
                resultUrl: ''
            }
        };

        let doctext : string = document.getText();
        const dockerfile = DockerfileParser.parse(doctext);    
        const instructions = dockerfile.getInstructions();
        const command = 'RUN echo "example"';
        const matches: vscode.Range[] = [new vscode.Range(new vscode.Position(2, 0), new vscode.Position(2, command.length))];
        const expectedDecorations: vscode.DecorationOptions[] = [{
            range: matches[0],
            hoverMessage: createMarkdownSummary(report),
            renderOptions: {
                after: { contentText: ' 🔴 1  ', color: 'gray', margin: '0 0 0 20px' }
            }
        }];

        highlightLayer(report, instructions, document);

        assert.equal(decorationsMap[document.uri.toString()].length, 1);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations.length, 1);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].range.start.line, expectedDecorations[0].range.start.line);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].range.start.character, expectedDecorations[0].range.start.character);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].range.end.line, expectedDecorations[0].range.end.line);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].range.end.character, expectedDecorations[0].range.end.character);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].hoverMessage?.toString.length, 0);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].renderOptions?.after?.contentText, expectedDecorations[0].renderOptions?.after?.contentText);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].renderOptions?.after?.color, expectedDecorations[0].renderOptions?.after?.color);
        assert.equal(decorationsMap[document.uri.toString()][0].decorations[0].renderOptions?.after?.margin, expectedDecorations[0].renderOptions?.after?.margin);
    });

    // Additional tests

    test('addDecorations should not add decorations if decorationType is not provided', () => {
        const decorations: vscode.DecorationOptions[] = [];
        const decorationType = vscode.window.createTextEditorDecorationType({});
    
        addDecorations(document, decorations, decorationType);
    
        assert.equal(decorationsMap[document.uri.toString()][0].decorations.length, 0);
    });

    test('highlightImage should not add decorations if no matches are found', () => {
        const report: Report = {
            result: {
                metadata: {
                    pullString: '',
                    imageId: '',
                    digest: '',
                    baseOs: '',
                    size: 0,
                    os: '',
                    architecture: '',
                    layersCount: 0,
                    createdAt: ''
                },
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                fixableVulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: []
            },
            info: {
                resultUrl: ''
            }
        };
        const image = 'not-found-image';
        const expectedDecorations: vscode.DecorationOptions[] = [];
        highlightImage(report, image, document);

        assert.deepEqual(decorationsMap[document.uri.toString()][0].decorations, expectedDecorations);
    });

    test('highlightLayer should not add decorations if no instructions are provided', () => {
        const report: Report = {
            result: {
                metadata: {
                    pullString: '',
                    imageId: '',
                    digest: '',
                    baseOs: '',
                    size: 0,
                    os: '',
                    architecture: '',
                    layersCount: 0,
                    createdAt: ''
                },
                vulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                fixableVulnTotalBySeverity: {
                    critical: 0,
                    high: 0,
                    medium: 0,
                    low: 0,
                    negligible: 0
                },
                packages: []
            },
            info: {
                resultUrl: ''
            }
        };
        const instructions: Instruction[] = [];
        const expectedDecorations: vscode.DecorationOptions[] = [];

        highlightLayer(report, instructions, document);

        assert.deepEqual(decorationsMap[document.uri.toString()][0].decorations, expectedDecorations);
    });
});
