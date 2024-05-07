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

      - 生成したコードに対する説明は不要です。コードのみを生成してください。
      - コードの必要な箇所にわかりやすくコメントを入れるなど、コードを読みやすくする工夫は歓迎します。
      - すでにコード内に書かれている内容は一切生成しないでください。不要です。
        - ユーザーにとってはコードが重複してしまうので、削除の手間がかかります。
      - コードを「\`\`\`」などマークダウン記号で囲まないでください。不要です。

      ${code}
    `
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
  for await (const messageStreamEvent of stream) {

    // 7. コードを挿入
    const content = messageStreamEvent.choices[0].delta.content || "";
    await insertCode(activeEditor, editPosition, content);

    // 8. 次の挿入位置を計算
    editPosition = nextPosition(editPosition, content);
  }
}
