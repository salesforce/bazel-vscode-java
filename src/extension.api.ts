import * as vscode from 'vscode';

export interface TerminalLogEvent {
	name: string;
	pattern: RegExp;
	fullMessage: string;
	workspaceRoot: string;
}

export interface TimeEvent {
	workspaceRoot: string;
	// Duration in seconds
	duration: number;
}

export interface TerminalLogPattern {
	name: string;
	pattern: RegExp;
	sendFullMessage: boolean;
}

export type AppendBazelTerminalLogPattern = (
	pattern: TerminalLogPattern
) => boolean;

export interface BazelEventsExtensionAPI {
	/* An event which is fired on start of a Bazel Sync session.
	 * The string points to path of the Workspace root.
	 */
	readonly onSyncStarted: vscode.Event<string>;
	/* An event which is fired on start of a Bazel Sync Directories session.
	 * The list of strings stores the list of directories in .bazelproject
	 * that are being synced.
	 */
	readonly onSyncDirectoriesStarted: vscode.Event<string[]>;
	/* An event which is fired on end of a Bazel Sync Directories session.
	 * The list of strings stores the list of directories in .bazelproject
	 * that are being synced.
	 */
	readonly onSyncDirectoriesEnded: vscode.Event<string[]>;
	/* An event which is fired when BazelTerminal listener catches a message which
	 * matches a registered pattern.
	 * The string points to path of the Workspace root.
	 */
	readonly onBazelTerminalLog: vscode.Event<TerminalLogEvent>;
	/* A method do register a patter to be matched agains BazelTerminalLog to trigger
	 * the event onBazelTerminalLog
	 */
	readonly appendBazelTerminalLogPattern: AppendBazelTerminalLogPattern;
}
