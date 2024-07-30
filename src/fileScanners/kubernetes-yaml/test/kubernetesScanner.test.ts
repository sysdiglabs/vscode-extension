import * as assert from 'assert';
import * as vscode from 'vscode';
import { isKubernetesFile } from '../kubernetesScanner';


suite('Kubernetes Scanner Tests', () => {
    let testDocument: vscode.TextDocument;

    setup(async () => {
        // Create a test document with YAML content
        const yamlContent = `
            kind: Deployment
            spec:
                template:
                    spec:
                        containers:
                            - name: nginx
                              image: nginx:latest
                            - name: mysql
                              image: mysql:latest
        `;
        testDocument = await vscode.workspace.openTextDocument({
            language: 'yaml',
            content: yamlContent
        });
    });

    test('isKubernetesFile should return true for a Kubernetes file', () => {
        // Call the isKubernetesFile function
        const result = isKubernetesFile(testDocument);

        // Assert that the result is true
        assert.strictEqual(result, true);
    });
});
