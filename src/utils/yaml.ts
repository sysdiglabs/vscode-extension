import * as vscode from 'vscode';
import * as yamlAst from 'yaml-ast-parser';

export interface ImageInfo {
  image: string;
  range: vscode.Range;
}

export function extractImagesAndRanges(document: vscode.TextDocument): ImageInfo[] {
  const fileContent = document.getText();
  const root = yamlAst.load(fileContent);
  const imageInfos: ImageInfo[] = [];
  if (root && root.kind === yamlAst.Kind.MAP) {
    traverseNode(root, [], imageInfos, document);
  }
  return imageInfos;
}

function traverseNode(node: yamlAst.YAMLNode, path: string[], imageInfos: ImageInfo[], document: vscode.TextDocument): void {
  if (node.kind === yamlAst.Kind.MAP) {
    const map = node as yamlAst.YamlMap;
    for (const mapping of map.mappings) {
      const keyNode = mapping.key;
      const valueNode = mapping.value;

      if (!keyNode || !valueNode) {
        continue;
      }

      if (keyNode.value === 'image' && valueNode.kind === yamlAst.Kind.SCALAR) {
        const imageInfo: ImageInfo = {
          image: valueNode.value,
          range: new vscode.Range(document.positionAt(valueNode.startPosition), document.positionAt(valueNode.endPosition)),
        };
        imageInfos.push(imageInfo);
      } else {
        traverseNode(valueNode, [...path, keyNode.value], imageInfos, document);
      }
    }
  } else if (node.kind === yamlAst.Kind.SEQ) {
    const seq = node as yamlAst.YAMLSequence;
    seq.items.forEach((item, index) => {
      traverseNode(item, [...path, String(index)], imageInfos, document);
    });
  }
}
