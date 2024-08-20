import * as vscode from 'vscode';
import * as yaml_ast from 'yaml-ast-parser';

export interface ImageInfo {
  image: string;
  range: vscode.Range;
}

export function extractImagesAndRanges(document: vscode.TextDocument): ImageInfo[] {
  const fileContent = document.getText();
  const root = yaml_ast.load(fileContent);
  const imageInfos: ImageInfo[] = [];
  if (root && root.kind === yaml_ast.Kind.MAP) {
    traverseNode(root, [], imageInfos, document);
  }
  return imageInfos;
}

function traverseNode(node: yaml_ast.YAMLNode, path: string[], imageInfos: ImageInfo[], document: vscode.TextDocument): void {
  if (node.kind === yaml_ast.Kind.MAP) {
    const map = node as yaml_ast.YamlMap;
    for (const mapping of map.mappings) {
      const keyNode = mapping.key;
      const valueNode = mapping.value;
      if (keyNode.value === 'image' && valueNode.kind === yaml_ast.Kind.SCALAR) {
        const imageInfo: ImageInfo = {
          image: valueNode.value,
          range: new vscode.Range(document.positionAt(valueNode.startPosition), document.positionAt(valueNode.endPosition)),
        };
        imageInfos.push(imageInfo);
      } else {
        traverseNode(valueNode, [...path, keyNode.value], imageInfos, document);
      }
    }
  } else if (node.kind === yaml_ast.Kind.SEQ) {
    const seq = node as yaml_ast.YAMLSequence;
    seq.items.forEach((item, index) => {
      traverseNode(item, [...path, String(index)], imageInfos, document);
    });
  }
}
