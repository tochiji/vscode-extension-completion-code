import type * as vscode from 'vscode';

export async function insertCode(activeEdotor: vscode.TextEditor, position: vscode.Position, content: string) {
  await activeEdotor.edit((editBuilder) => {
    editBuilder.insert(position, content);
  });
}
