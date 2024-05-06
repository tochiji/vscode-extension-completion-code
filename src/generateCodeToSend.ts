export function generateCodeToSend({ docText, selectLineNumber, fileName }:
  { docText: string, selectLineNumber: number, fileName: string }): { code: string } {

  // 1. textのlineNumber行目に、「##### コード挿入場所 #####」と入れる
  const lines = docText?.split('\n');
  lines.splice(selectLineNumber, 0, "##### コード挿入場所 #####");

  // 2. ファイルの冒頭にファイル名を挿入
  lines.splice(0, 0, `
	========================================
	fileName: ${fileName}
	========================================
	`);

  // 3. ファイル名とコード挿入場所を挿入したテキストを返す。これをLLMに送る
  const code = lines.join('\n');

  return { code };
}

export function generateCodeToSendForClaude({ docText, selectLineNumber, fileName }:
  { docText: string, selectLineNumber: number, fileName: string }): { code: string } {

  // 1. textのlineNumber行目に、「<intertYourCode>」と入れる
  const lines = docText?.split('\n');
  lines.splice(selectLineNumber, 0, "<intertYourCode></intertYourCode>");

  // 2. ファイルの冒頭にファイル名を挿入
  lines.splice(0, 0, `
	<fileName>
	${fileName}
	</fileName>

  <code>
	`);

  // 3. ファイル名とコード挿入場所を挿入したテキストを返す。これをLLMに送る
  const code = `${lines.join('\n')}</code>`;


  return { code };
}
