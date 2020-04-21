const vscode = require('vscode');

function activate() {
	vscode.window.showInformationMessage('Basel JDT LS is activated');
}

exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
