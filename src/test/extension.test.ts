import * as vscode from 'vscode';
import * as assert from 'assert';
import * as extension from '../extension';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('Extension Tests', () => {
	let tempDir : string;
    let testUri : vscode.Uri;
    let testFsPath : fs.PathLike;

	setup(function() {
        // Create a test path and Uri
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        testUri = vscode.Uri.file(tempDir);
        testFsPath = testUri.fsPath;
    });

    teardown(function() {
        // Clean up the test file
        if (fs.existsSync(testFsPath)) {
            fs.rmSync(testFsPath, { recursive: true });
        }
    });

	suiteTeardown(function() {
        // Remove the temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir);
        }
    });

	test('activate method should register commands and output channel', async () => {
		const context: vscode.ExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
            globalState: {
                get: sinon.stub(),
                update: sinon.stub()
            },
			globalStorageUri: {
				fsPath: testFsPath
			}
        } as unknown as vscode.ExtensionContext;

		await extension.activate(context);

		// Check if commands are registered
		assert.strictEqual(context.subscriptions.length, 7);

		// Check if output channel is created
		assert.ok(extension.outputChannel);
	});

	test('deactivate method should do nothing', () => {
		extension.deactivate();
		// No assertion needed, just ensure the method does not throw an error
	});
});
