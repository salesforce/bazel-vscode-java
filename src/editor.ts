import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as bazelproject from './bazelproject';
import * as bazelmodule from './bazelmodule';


export function handleMessages(extCtx: vscode.ExtensionContext, webPanel: vscode.WebviewPanel, message: any) {
    switch (message.command) {
        case 'importProject': {
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

function postLocation(fileUri: vscode.Uri[] | undefined, webPanel: vscode.WebviewPanel, command: string) {
    if (fileUri && fileUri[0]) {
        // vscode.window.showInformationMessage('Selected root ' + fileUri[0].fsPath);
        webPanel.webview.postMessage({
            command: command,
            data: fileUri[0].fsPath
        });
    }
}

export function getWebviewContent(panel: vscode.WebviewPanel, extCtx: vscode.ExtensionContext): string {
    const jQueryOnDiskPath = vscode.Uri.file(path.join(extCtx.extensionPath, '/js/jquery.js'));
    const jQuerySrc: vscode.Uri = panel.webview.asWebviewUri(jQueryOnDiskPath);

    const editorJsOnDiskPath = vscode.Uri.file(path.join(extCtx.extensionPath, '/js/editor.js'));
    const editoJsSrc: vscode.Uri = panel.webview.asWebviewUri(editorJsOnDiskPath);

    const editorCssOnDiskPath = vscode.Uri.file(path.join(extCtx.extensionPath, '/css/editor.css'));
    const editoCssSrc: vscode.Uri = panel.webview.asWebviewUri(editorCssOnDiskPath);

    return `
    <!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="${editoCssSrc}">
        <script src="${jQuerySrc}"></script>
        <title>Import Bazel project wizard</title>
    </head>
    
    <body>
        <div>
            <label for="workspaceLocation">Project WORKSPACE location</label>
            <input type="text" id="workspaceLocation" name="workspaceLocation" style="width: 50%; height: 1.5em;">
            <button id="browseWorkspace" name="browseWorkspace" style="height: 1.5em;">Browse...</button>
        </div>
        <div>
            <button id="loadModulesBtn" style="height: 1.5em;">Load modules</button>
            <button id="importProjectBtn" style="height: 1.5em;" disabled>Start import</button>
        </div>
        <br><br>
        <div>
            <label for="filterModules">Filter modules:</label>
            <input type="text" id="filterModules" name="filterModules" style="width: 50%; height: 1.5em;" disabled>
            <button id="resetFilter" name="resetFilter" style="height: 1.5em;" disabled>Reset filter</button>
        </div>
    
        <div id="moduleList" style="width: 100%; height: 50%; overflow-y: scroll;">
        </div>

        <script src="${editoJsSrc}"></script>
    </body>
    
    </html>
    `;
}
