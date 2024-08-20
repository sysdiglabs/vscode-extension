import * as vscode from 'vscode';
import * as assert from 'assert';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as os from 'os';
import { KubernetesCodeLensProvider } from '../KubernetesCodeLensProvider';
import path from 'path';

suite('KubernetesCodeLensProvider Tests', () => {
    let provider: KubernetesCodeLensProvider;

    let tempDir: string;
    let testUri: vscode.Uri;
    let testFsPath: fs.PathLike;
    let testFilePath : string;
    let testFileUri : vscode.Uri;
    let testFileFsPath : fs.PathLike;

    setup(() => {
        provider = new KubernetesCodeLensProvider();

        // Create a test path and Uri
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        testUri = vscode.Uri.file(tempDir);
        testFsPath = testUri.fsPath;
        
        // Create a test file path and file Uri
        testFilePath = path.join(tempDir, 'test-file.yaml');
        testFileUri = vscode.Uri.file(testFilePath);
        testFileFsPath = testFileUri.fsPath;

        const doc = {
            apiVersion: 'v1',
            kind: 'Pod',
            spec: {
                containers: [
                    {
                        image: 'nginx'
                    }
                ]
            }
        };
        const yamlStr = yaml.dump(doc);
        fs.writeFileSync(testFileFsPath, yamlStr);
    });

    test('provideCodeLenses should return an empty array if the document is not a Kubernetes file', async () => {
        const document = await vscode.workspace.openTextDocument({ language: 'plaintext', content: 'This is a test document' });
        const codeLenses = provider.provideCodeLenses(document, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 0);
    });

    test('provideCodeLenses should return code lenses for scanning Kubernetes manifest', async () => {
        const document = await vscode.workspace.openTextDocument(testFileUri);
        const editor = await vscode.window.showTextDocument(document);
        assert.strictEqual(document.getText(), 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - image: nginx\n');
        const codeLenses = provider.provideCodeLenses(document, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 2);
        assert.strictEqual(codeLenses[0].command?.title, '$(rocket) Scan manifest');
        assert.strictEqual(codeLenses[1].command?.title, '$(beaker) Scan Image');
    });

    test('provideCodeLenses should not fail for an invalid Pod or Deployment manifest', async () => {
        const doc = {
            apiVersion: 'v1',
            kind: 'Pod',
            spec: {
                containers: [             
                    {
                        invalidImageField: 'nginx' // This is an invalid field, so it should get ignored
                    }
                ]
            }
        };
        const yamlStr = yaml.dump(doc);
        fs.writeFileSync(testFileFsPath, yamlStr);

        const document = await vscode.workspace.openTextDocument(testFileUri);
        const editor = await vscode.window.showTextDocument(document);
        assert.strictEqual(document.getText(), 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n    - invalidImageField: nginx\n');
        const codeLenses = provider.provideCodeLenses(document, new vscode.CancellationTokenSource().token);
        assert.strictEqual(codeLenses.length, 1);
        assert.strictEqual(codeLenses[0].command?.title, '$(rocket) Scan manifest');
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
