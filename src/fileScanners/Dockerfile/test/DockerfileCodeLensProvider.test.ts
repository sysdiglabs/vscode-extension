import * as assert from 'assert';
import * as vscode from 'vscode';
import { DockerfileCodeLensProvider } from '../DockerfileCodeLensProvider';

suite('DockerfileCodeLensProvider Tests', () => {
    let provider: DockerfileCodeLensProvider;
    const shortDockerfile = `FROM node:14`;

    setup(() => {
        provider = new DockerfileCodeLensProvider();
    });

    test('provideCodeLenses should return an empty array if the document is not a Dockerfile', async () => {
        let testDocument = await vscode.workspace.openTextDocument({
            language: 'text',
            content: "This is a test document"
        });
        const codeLenses = provider.provideCodeLenses(testDocument, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 0);
    });

    test('provideCodeLenses should return code lenses for FROM instruction in a Dockerfile', async () => {
        
        let testDocument = await vscode.workspace.openTextDocument({
            language: 'dockerfile',
            content: shortDockerfile
        });
        const codeLenses = provider.provideCodeLenses(testDocument, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 2);

        const buildAndScanCommand = codeLenses[0].command;
        assert.strictEqual(buildAndScanCommand?.title, '$(rocket) Build and Scan');
        assert.strictEqual(buildAndScanCommand?.command, 'sysdig-vscode-ext.scanDockerfile');
        assert.deepStrictEqual(buildAndScanCommand?.arguments, [testDocument]);

        const scanImageCommand = codeLenses[1].command;
        assert.strictEqual(scanImageCommand?.title, '$(beaker) Scan Base Image');
        assert.strictEqual(scanImageCommand?.command, 'sysdig-vscode-ext.scanImage');
        assert.deepStrictEqual(scanImageCommand?.arguments, ['node:14']);
    });

    test('refresh should fire onDidChangeCodeLenses event', () => {
        let eventFired = false;
        provider.onDidChangeCodeLenses(() => {
            eventFired = true;
        });

        provider.refresh();
        assert.strictEqual(eventFired, true);
    });
});
