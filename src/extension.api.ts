import * as vscode from 'vscode';

export interface MyExtensionAPI{
    /* An event which is fired on start of a Bazel Sync session.
    * TBA
    */
    readonly onSyncStarted: vscode.Event<string>;
    readonly onBazelProjectFileCreated: vscode.Event<string>;
    readonly onBazelProjectFileUpdated: vscode.Event<vscode.Uri>;
    readonly onSyncDirectoriesStarted: vscode.Event<string[]>;
    readonly onSyncDirectoriesEnded: vscode.Event<string[]>;
}
