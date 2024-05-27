import * as vscode from 'vscode';
import { completionCodeClaude } from './claude';
import { completionCodeGemini } from './gemini';
import { completionCodeOpenAI } from './openai';

export function activate(context: vscode.ExtensionContext) {
	console.log('inline-completions started');

	vscode.commands.registerCommand("vscode.contextmenu.completion-code-openai", completionCodeOpenAI);
	vscode.commands.registerCommand("vscode.contextmenu.completion-code-gemini", completionCodeGemini);
	vscode.commands.registerCommand("vscode.contextmenu.completion-code-claude", completionCodeClaude);
}

