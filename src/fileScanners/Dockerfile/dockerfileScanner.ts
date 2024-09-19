import * as vscode from 'vscode';
import * as fs from 'fs';
import { exec } from 'child_process';
import { DockerfileParser } from 'dockerfile-ast';
import { Layer, Report } from '../../types';
import { outputChannel } from '../../extension';
import { clearDecorations, highlightImage, highlightLayer as highlightLayers } from '..';

export const documentId = 'dockerfile';

export async function scanDockerfile(document: vscode.TextDocument, buildAndScanEnabled: boolean = true, baseImageRange?: vscode.Range) {
    let doctext : string = document.getText();
    const dockerfile = DockerfileParser.parse(doctext);

    // Clear previous highlights for this document
    clearDecorations(document);

    // 1. Scan the base image
    let baseImage: string | undefined;
    const instructions = dockerfile.getInstructions();
    for (let i = instructions.length - 1; i >= 0; i--) {
        const instruction = instructions[i];
        if (instruction.getInstruction() === 'FROM') {
            baseImage = instruction.getArguments().at(0)?.toString();
            break;
        }
    }

    let report : Report | undefined;
    if (baseImage) {
        report = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', baseImage);
        if (!report) {
            vscode.window.showErrorMessage('Failed to scan base image ' + baseImage);
        } else {
            highlightImage(report, document, baseImageRange);
        }
    }

    if (!buildAndScanEnabled) {
        return;
    }

    const loadingBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    loadingBar.text = "$(sync~spin) Building and scanning image with Sysdig...";
    loadingBar.show();

    // 2. Build Dockerfile if Docker is available
    if (await dockerAvailable()) {
        if (vscode.window.activeTextEditor) {
            const imageName = `sysdig-build-and-scan-${Math.random().toString(36).substring(7)}`;
            const buildResult = await buildDockerImage(imageName, document.uri.fsPath);
            const isBuilt = await imageExists(imageName);
            if (buildResult && isBuilt) {
                // 3. Scan the built image
                report = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', imageName, /* updateTrees: */ true, /* source: */ document);
                if (!report) {
                    vscode.window.showErrorMessage('Failed to scan built image ' + imageName);
                } else if (!report.result.layers) {
                    vscode.window.showWarningMessage('No layers found in image ' + imageName);
                } else {
                    // 4. Get vulnerabilities for each layer (from bottom to top)
                    highlightLayers(report, instructions, document);
                }
                // 5. Delete the generated image
                await deleteDockerImage(imageName);
            } else {
                vscode.window.showErrorMessage('Failed to build Dockerfile');
            }
        } else {
            vscode.window.showErrorMessage('No active text editor');
        }
    } else {
        vscode.window.showWarningMessage('Docker is not installed, cannot build and scan Dockerfile');
    }
    loadingBar.hide();
}

export async function execCommand(command: string): Promise<{ stdout: string, stderr: string }> {
    outputChannel.appendLine(command);

    return new Promise((resolve, reject) => {
        exec(command, (error: Error | null, stdout, stderr) => {
            if (error) {
                reject({ stdout, stderr });
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}
  
export async function dockerAvailable(): Promise<boolean> {
    try {
        const { stdout } = await execCommand('docker --version');
        return true;
    } catch (error : Error | any) {
        console.error(`Docker is not available: ${error.stderr}`);
        return false;
    }
}
  
export async function buildDockerImage(imageName: string, path : string): Promise<boolean> {
    // Gather ARGs from Dockerfile if any
    const dockerfile = DockerfileParser.parse(fs.readFileSync(path, 'utf8'));
    const instructions = dockerfile.getInstructions();

    // For each ARG, check if it's defined in the environment
    let args = '';
    for (const instruction of instructions) {
        if (instruction.getInstruction() === 'ARG') {
            const argName = instruction.getArguments().at(0)?.toString()?.split('=')[0];
            let argValue = instruction.getArguments().at(0)?.toString()?.split('=').slice(1).join('=');

            if (argName) {
                argValue = await vscode.window.showInputBox({
                    prompt: `Enter value for Dockerfile argument ${argName}`,
                    value: argValue,
                    ignoreFocusOut: true
                });
            }

            if (argName && argValue) {
                args += `--build-arg ${argName}=${argValue} `;
            }
        }
    }

    // Build the Docker image
    try {
        const { stdout } = await execCommand(`docker build ${args} -t ${imageName} -f '${path}' '${path.replace(/\/[^/]+$/, '')}'`);
        return true;
    } catch (error : Error | any) {
        console.error(`Error building Docker image: ${error.stderr}`);
        return false;
    }
}
  
export async function imageExists(imageName: string): Promise<boolean> {
    try {
        const { stdout } = await execCommand(`docker images -q ${imageName}`);
        if (stdout.trim()) {
            return true;
        } else {
            return false;
        }
    } catch (error : Error | any) {
        console.error(`Error checking Docker image: ${error.stderr}`);
        return false;
    }
}
  
export async function deleteDockerImage(imageName: string): Promise<boolean> {
    try {
        const { stdout } = await execCommand(`docker rmi ${imageName}`);
        return true;
    } catch (error : Error | any) {
        console.error(`Error deleting Docker image: ${error.stderr}`);
        return false;
    }
}

export function isDockerfile(document: vscode.TextDocument) : boolean {
    return document.languageId === documentId;
}

export function getLineFromDockerfile(document: vscode.TextDocument, layers: Layer[], wantedDigest : string) : vscode.Range | undefined {
    const dockerfile = DockerfileParser.parse(document.getText());
    const instructions = dockerfile.getInstructions();

    let instructionIndex = instructions.length - 1;
    let layerIndex = layers.length - 1;

    while (instructionIndex >= 0 && layerIndex >= 0) {
        const instruction = instructions[instructionIndex];
        const layer = layers[layerIndex];

        // Skip FROM instructions as base image is already scanned
        if (instruction.getInstruction() === 'FROM') {
            instructionIndex = -1;
            return instruction.getRange() as vscode.Range;
        }

        if (layer.command.includes(instruction.getInstruction())) {
            instructionIndex--;
            layerIndex--;
        } else {
            layerIndex--; // Assume that if the commands don't match, this layer is not relevant
            continue;
        }

        if (layer.digest === wantedDigest) {
            return instruction.getRange() as vscode.Range;
        }

    }
    return undefined;
}
