import * as vscode from 'vscode';
import * as piEditor from './editor';

export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "bazelimport" is now active!');


	// let disposable = vscode.commands.registerCommand('bazelimport.helloWorld', () => {
	// 	vscode.window.showInformationMessage('Hello World from BazelImport!');
	// });
	// context.subscriptions.push(disposable);

	// let explorerContextDisp = vscode.commands.registerCommand('bazelimport.menus.explorercontext', () => {
	// 	vscode.window.showInformationMessage('explorer context Hello World!');
	// });
	// context.subscriptions.push(explorerContextDisp);

	let viewTitleDisp = vscode.commands.registerCommand('bazelimport.menus.viewtitle', () => {
		// vscode.window.showInformationMessage('View Title Hello World!');
		// let options: vscode.InputBoxOptions = {
		// 	prompt: "Label: ",
		// 	placeHolder: "(placeholder)",
		// };

		// vscode.window.showInputBox(options).then(value => {
		// 	if (value) {
		// 		vscode.window.showInformationMessage('Entered value ' + value);
		// 	}
		// });

		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'bazelImportWizard', // Identifies the type of the webview. Used internally
			'Import wizard', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);
		panel.webview.html = piEditor.getWebviewContent(context);

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			message => piEditor.handleMessages(context, panel, message),
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(viewTitleDisp);

}

// this method is called when your extension is deactivated
export function deactivate() { }
