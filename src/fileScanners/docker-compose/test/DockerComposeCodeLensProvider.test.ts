import * as assert from 'assert';
import * as vscode from 'vscode';
import { DockerComposeCodeLensProvider } from '../DockerComposeCodeLensProvider';

suite('DockerComposeCodeLensProvider Tests', () => {
    let provider: DockerComposeCodeLensProvider;

    setup(() => {
        provider = new DockerComposeCodeLensProvider();
    });

    test('provideCodeLenses should return an empty array if the document is not a compose file', async () => {
        let testDocument = await vscode.workspace.openTextDocument({
            language: 'text',
            content: "This is a test document"
        });
        const codeLenses = provider.provideCodeLenses(testDocument, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 0);
    });

    test('provideCodeLenses should return code lenses for each image in the compose file', async () => {
        let testDocument = await vscode.workspace.openTextDocument({
            language: 'dockercompose',
            content: `
                version: '3'
                services:
                    web:
                        image: nginx
                    db:
                        image: mysql
            `
        });
        const codeLenses = provider.provideCodeLenses(testDocument, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 3);
    });

    test('refresh should fire the onDidChangeCodeLenses event', () => {
        let eventFired = false;
        provider.onDidChangeCodeLenses(() => {
            eventFired = true;
        });
        provider.refresh();
        assert.strictEqual(eventFired, true);
    });
});
