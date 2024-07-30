import * as assert from 'assert';
import * as vscode from 'vscode';
import { scanDockerfile, dockerAvailable, execCommand, buildDockerImage, imageExists, deleteDockerImage, isDockerfile, getLineFromDockerfile } from '../dockerfileScanner';

suite('Dockerfile Scanner Tests', () => {
    let testDocument: vscode.TextDocument;

    setup(async () => {
        // Create a test document
        const testText = `
            FROM node:14
            WORKDIR /app
            COPY package.json .
            RUN npm install
            COPY . .
            CMD ["npm", "start"]
        `;
        testDocument = await vscode.workspace.openTextDocument({ language: 'dockerfile', content: testText });
    });

    test('isDockerfile should return true for a Dockerfile', () => {
        // Call the isDockerfile function
        const result = isDockerfile(testDocument);

        // Assert that the result is true
        assert.strictEqual(result, true);
    });
});
