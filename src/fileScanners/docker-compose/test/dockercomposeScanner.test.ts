import * as assert from 'assert';
import * as vscode from 'vscode';
import { scanComposeFile, isComposeFile } from '../dockercomposeScanner';
import { decorationsMap } from '../../highlighters';

suite('Docker Compose Scanner Tests', () => {
    let testDocument: vscode.TextDocument;

    setup(async () => {
        // Create a test document with sample YAML content
        const yamlContent = `
            version: '3'
            services:
              web:
                image: nginx
              db:
                image: mysql
        `;
        testDocument = await vscode.workspace.openTextDocument({
            language: 'dockercompose',
            content: yamlContent,
        });
    });
    
    test('isComposeFile should return true for a Docker Compose file', () => {
        // Call the isComposeFile function
        const result = isComposeFile(testDocument);

        // Verify that the result is true
        assert.strictEqual(result, true);
    });
});
