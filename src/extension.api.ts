import * as vscode from 'vscode';

export interface BazelEventsExtensionAPI {
	/* An event which is fired on start of a Bazel Sync session.
	 * The string points to path of the Workspace root.
	 */
	readonly onSyncStarted: vscode.Event<string>;
	/* An event which is fired on end of a Bazel Sync session.
	 * The string points to path of the Workspace root.
	 */
	readonly onSyncEnded: vscode.Event<string>;
	/* An event which is fired on creation of a .bazelproject file.
	 *The string points to path of the .bazelproject file.
	 */
	readonly onBazelProjectFileCreated: vscode.Event<string>;
	/* An event which is fired on updates to the .bazelproject file.
	 * The Uri points to Uri of the .bazelproject file.
	 */
	readonly onBazelProjectFileUpdated: vscode.Event<vscode.Uri>;
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
}
