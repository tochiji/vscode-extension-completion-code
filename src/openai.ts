import OpenAI from "openai";
import * as vscode from 'vscode';
import { nextPosition } from "./calcPosition";
import { generateCodeToSend } from "./generateCodeToSend";
import { getVSCodeObject } from "./getVSCodeObject";
import { insertCode } from "./insertCode";

export async function completionCodeOpenAI() {

  // 1. アクティブなエディタのドキュメントオブジェクトを取得
  const { activeEditor, ref, fileName, docText, languageId, selectLineNumber } = getVSCodeObject();

  // 2. LLMに送るコードを生成
  const { code } = generateCodeToSend({ docText, selectLineNumber, fileName });

  // 3. APIキーとモデルをVSCodeの設定から取得
  const OPENAI_API_KEY = vscode.workspace.getConfiguration("completioncode").get('OPENAI_API_KEY', "");
  const OPENAI_API_MODEL = vscode.workspace.getConfiguration("completioncode").get('OPENAI_API_MODEL', "");

  // 4. LLMにコードを送信
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
    role: 'system',
    content: 'あなたはコードを補完するシステムです。与えられるファイル名とコードから、適切にコードを補完してください。'
  }, {
    role: 'user',
    content: `
      次のコード（${languageId}）について、「##### コード挿入場所 #####」に入れるべきコードを考えて、そこに挿入するべきコードのみを生成してください。
      - コードの必要な箇所にわかりやすくコメントを入れるなど、コードを読みやすくする工夫は歓迎します。

      ${code}
    `
  },
  {
    role: 'assistant',
    content: `\`\`\`${languageId}\n`
  }];

  // 5. LLMからの返答を取得
  const stream = await openai.chat.completions.create({
    model: OPENAI_API_MODEL, messages, stream: true,
  }).catch((error) => {
    console.error(error);
    activeEditor?.edit((editBuilder) => {
      editBuilder.insert(ref.end, `// Failed to get completion from OpenAI\n// ${error.message}`);
    })
    throw new Error('Failed to get completion from OpenAI');
  });


  // 6. 補完されたコードのストリームを順次処理
  let editPosition = ref.end;
  let buffer = "";
  for await (const messageStreamEvent of stream) {
    // 7. コードを挿入
    const content = messageStreamEvent.choices[0].delta.content || "";
    buffer += content;

    // 8. 改行が含まれない場合はcontinue
    if (!buffer.includes("\n")) {
      continue;
    }

    // 9. コードブロックを削除したい。bufferのうち、最終改行後の部分を取得。
    // 例えば、bufferが「aaa\nbbb\nccc」の場合...
    // lastContentは「ccc」
    // bufferは「aaa\nbbb\n」
    const lastNewLineIndex = buffer.lastIndexOf("\n");
    const lastContent = buffer.slice(lastNewLineIndex + 1);
    buffer = buffer.slice(0, lastNewLineIndex + 1);

    // 10. コードブロックを削除したい。
    // もしbufferに「```langname\n」または「```\n」が含まれていれば、その部分を削除
    buffer = buffer.replace(/```[a-zA-Z0-9]+\n$/, "");

    // 11. コードを挿入
    await insertCode(activeEditor, editPosition, buffer);

    // 12. 次の挿入位置を計算
    editPosition = nextPosition(editPosition, buffer);

    // 13. すでに記入したbufferの内容をクリア。lastContentを次のbufferにする。
    buffer = lastContent;
  }
}
