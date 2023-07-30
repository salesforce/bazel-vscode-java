import { ExtensionContext, Uri, commands } from 'vscode';
import { Commands } from './commands';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, async () => {
        commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.SYNC_PROJECTS);
    }));
	context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, async (uri: Uri) => {
        commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.UPDATE_CLASSPATHS, uri.toString());
    }));
}

export function deactivate() {
}
