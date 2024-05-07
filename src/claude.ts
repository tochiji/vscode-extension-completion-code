import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.mjs';
import * as vscode from 'vscode';
import { nextPosition } from "./calcPosition";
import { generateCodeToSendForClaude } from "./generateCodeToSend";
import { getVSCodeObject } from "./getVSCodeObject";
import { insertCode } from "./insertCode";

export async function completionCodeClaude() {

  // 1. アクティブなエディタのドキュメントオブジェクトを取得
  const { activeEditor, ref, fileName, docText, languageId, selectLineNumber } = getVSCodeObject();

  // 2. LLMに送るコードを生成
  const { code } = generateCodeToSendForClaude({ docText, selectLineNumber, fileName });

  // 3. APIキーとモデルをVSCodeの設定から取得
  const ANTHROPIC_API_KEY = vscode.workspace.getConfiguration("completioncode").get('ANTHROPIC_API_KEY', "");
  const ANTHROPIC_CLAUDE_MODEL = vscode.workspace.getConfiguration("completioncode").get('ANTHROPIC_CLAUDE_MODEL', "");

  // 4. LLMにコードを送信
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const messages: MessageParam[] = [{
    role: 'user',
    content: `
      コードを渡します。以下のファイル名とコードをよく読んでください。
  
      <code>
      ${code}
      </code>

      「<intertYourCode></intertYourCode>」に入れるべきコードを考えて、そこに挿入するべきコードのみを生成してください。

      - 補完するコードが長くなる場合、省略せず必要な全文を出力してください。
      - 生成したコードに対する説明は不要です。コードのみを生成してください。
      - コードの必要な箇所にわかりやすくコメントを入れるなど、コードを読みやすくする工夫は歓迎します。
      - すでにコード内に書かれている内容は一切生成しないでください。
        - 例えばある関数内のコードを補完する場合、その関数全体は出力しないでください。
          - ユーザーにとってはコードが重複してしまうので、削除の手間がかかります。
        - コードを「\`\`\`」などマークダウン記号で囲まないでください。
    `
  }];

  // 5. LLMからの返答を取得
  const stream = await anthropic.messages.create({
    system: "あなたはコードを補完する専用のシステムです。与えられるファイル名とコードから、適切に補完コードを生成してください。",
    model: ANTHROPIC_CLAUDE_MODEL,
    messages,
    stream: true,
    max_tokens: 3000
  }).catch((error) => {
    console.error(error);
    activeEditor?.edit((editBuilder) => {
      editBuilder.insert(ref.end, `// Failed to get completion from Claude\n// ${error.message}`);
    })
    throw new Error('Failed to get completion from Claude');
  });


  // 6. 補完されたコードのストリームを順次処理
  let editPosition = ref.end;
  for await (const messageStreamEvent of stream) {

    // 7. "content_block_delta" のみを処理。それ以外にはメッセージは入ってこない
    if (messageStreamEvent.type !== "content_block_delta") {
      continue;
    }

    // 8. コードを挿入
    const content = messageStreamEvent.delta.text || "";
    await insertCode(activeEditor, editPosition, content);

    // 9. 次の挿入位置を計算
    editPosition = nextPosition(editPosition, content);
  }
}
