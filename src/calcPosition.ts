import type * as vscode from 'vscode';

export function nextPosition(position: vscode.Position, content: string): vscode.Position {
  let p = position;

  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {

      // 改行があったら、次の行の先頭に移動
      p = p.with(p.line + 1, 0);
    }

    // 改行以外の場合、次の文字に移動
    p = p.with(p.line, p.character + 1);
  }
  return p;
}
