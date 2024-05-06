import * as vscode from 'vscode';

export function getVSCodeObject(): {
  activeEditor: vscode.TextEditor,
  doc: vscode.TextDocument,
  ref: vscode.Selection
  fileName: string,
  docText: string,
  languageId: string,
  selectLineNumber: number
} {
  // 1. アクティブなエディタのドキュメントオブジェクトを取得
  const activeEditor = vscode.window.activeTextEditor;
  const doc = activeEditor?.document;

  // 2. コンテキストメニューを押した時の選択範囲を取得
  const ref = activeEditor?.selection;

  if (!doc || !ref) {
    throw new Error('No active editor');
  }

  // 3. 開いているファイル名と言語を取得
  const fileName = doc?.fileName.split('/').pop() || "";
  const languageId = doc?.languageId;

  // 4. 開いているファイルのテキスト全文を取得
  const docText = doc?.getText();

  // 5. 選択範囲の開始行番号を取得。この行にコードを挿入する
  const selectLineNumber = ref.start.line;

  return { activeEditor, doc, ref, fileName, docText, languageId, selectLineNumber };
}
