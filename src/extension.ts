import * as vscode from 'vscode';
import * as path from 'path';
import * as pieditor from './editor';

export function activate(context: vscode.ExtensionContext) {
	let panel: vscode.WebviewPanel | undefined = undefined;

	console.log('Extension "bazelimport" is now active!');

	let viewTitleDisp = vscode.commands.registerCommand('bazelimport.menus.viewtitle', () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		if (panel) {
			// If we already have a panel, show it in the target column
			panel.reveal(columnToShowIn);
		} else {
			panel = vscode.window.createWebviewPanel(
				'bazelImportWizard', // Identifies the type of the webview. Used internally
				'Import wizard', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{
					enableScripts: true,
					retainContextWhenHidden: true,
					localResourceRoots: [
						vscode.Uri.file(path.join(context.extensionPath, 'js')),
						vscode.Uri.file(path.join(context.extensionPath, 'css'))
					]
				}
			);

			panel.webview.html = pieditor.getWebviewContent(panel, context);

			// Handle messages from the webview
			panel.webview.onDidReceiveMessage(
				message => pieditor.handleMessages(context, panel, message),
				undefined,
				context.subscriptions
			);

			panel.onDidDispose(
				() => {
					panel = undefined;
				},
				null,
				context.subscriptions
			);
		}
	});

	context.subscriptions.push(viewTitleDisp);

}

// this method is called when your extension is deactivated
export function deactivate() { }
