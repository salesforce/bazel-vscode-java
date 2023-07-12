import * as vscode from 'vscode';
import * as path from 'path';
import { BazelTaskProvider } from './bazelTaskProvider';

let bazelTaskProvider: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
	let panel: vscode.WebviewPanel | undefined = undefined;

	console.log('Extension "bazelimport" is now active!');

	bazelTaskProvider = vscode.tasks.registerTaskProvider(BazelTaskProvider.BazelType, new BazelTaskProvider());

}

// this method is called when your extension is deactivated
export function deactivate() { 
	if (bazelTaskProvider) {
		bazelTaskProvider.dispose();
	}
}
