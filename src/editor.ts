import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as bazelproject from './bazelproject';
import * as bazelmodule from './bazelmodule';


export function handleMessages(extCtx: vscode.ExtensionContext, webPanel: vscode.WebviewPanel, message: any) {
    switch (message.command) {
        case 'importProject': {
            console.log('importProject');
            const bi: bazelproject.BazelProject = new bazelproject.BazelProject(message.source, message.target);
            bi.openProject(message.modules);
            return;
        }
        case 'browseWorkspace':
            vscode.window.showOpenDialog({
                'title': 'Select WORKSPACE location',
                'canSelectFolders': false,
                'canSelectFiles': true,
                'canSelectMany': false,
                'openLabel': 'Select'
            }).then((fileUri) => postLocation(fileUri, webPanel, 'setworkspace'));
            return;
        case 'browseTarget':
            vscode.window.showOpenDialog({
                'title': 'Select target folder',
                'canSelectFolders': true,
                'canSelectFiles': false,
                'canSelectMany': false,
                'openLabel': 'Select'
            }).then((fileUri) => postLocation(fileUri, webPanel, 'settarget'));
            return;
        case 'loadModules': {
           const bi: bazelproject.BazelProject = new bazelproject.BazelProject(message.source, message.target);
            const modules: bazelmodule.BazelModule[] = bi.lookupModules();
            webPanel.webview.postMessage({
                command: 'listModules',
                data: modules
            });
            return;
        }
    }
}

export function getWebviewContent(extCtx: vscode.ExtensionContext): string {
    const htmlLocation = extCtx.asAbsolutePath('html/editor.html');
    const htmlPath = path.resolve(htmlLocation);
    const htmlSrc = fs.readFileSync(htmlPath);
    return htmlSrc ? htmlSrc.toString() : '';
}

function postLocation(fileUri: vscode.Uri[] | undefined, webPanel: vscode.WebviewPanel, command: string) {
    if (fileUri && fileUri[0]) {
        // vscode.window.showInformationMessage('Selected root ' + fileUri[0].fsPath);
        webPanel.webview.postMessage({
            command: command,
            data: fileUri[0].fsPath
        });
    }
}
