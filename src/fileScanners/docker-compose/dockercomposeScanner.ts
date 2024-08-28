import * as vscode from 'vscode';
import * as yaml from '../../utils/yaml';
import { Report } from '../../types';
import { clearDecorations, highlightImage } from '..';

export const documentId = 'dockercompose';

export async function scanComposeFile(document: vscode.TextDocument) {
  const imagesWithRange = yaml.extractImagesAndRanges(document);

  // Clear previous highlights for this document
  clearDecorations(document);

  for (const { image, range } of imagesWithRange) {
    let report: Report | undefined = await vscode.commands.executeCommand('sysdig-vscode-ext.scanImage', image, /* updateTrees: */ false, document, range);
    if (!report) {
      vscode.window.showErrorMessage('Failed to scan image ' + image);
      continue;
    }

    highlightImage(report, document, range);
  }
}

export function isComposeFile(document: vscode.TextDocument) {
  return document.languageId === documentId;
}
