import { AddressInfo } from 'net';
import { CustomExecution, ExtensionContext, Task, TaskScope, Uri, commands } from 'vscode';
import { startServer } from './bazelConsole';
import { Commands } from './commands';

export function activate(context: ExtensionContext) {

	context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, async () => {
        commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.SYNC_PROJECTS);
    }));
	context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, async (uri: Uri) => {
        commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.UPDATE_CLASSPATHS, uri.toString());
    }));

	startServer((socket)=> {
		// open Task



		const presenterTask = new Task({ type: "Bazel" }, TaskScope.Workspace, "Bazel Execution", "bazel", new CustomExecution(async () => {
			return new ServerTaskTerminal();
		}));

		socket.on('data', function (data) {
			// VS Code Pseudoterminal needs \r to reset line
			// UTF-8 is expected
			let output = data.toString().replace(/\r?\n/g, '\r\n');
		});
	}).then((server)=>{
		let address = server.address();
		if(address && typeof address !== 'string') {
			commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.UPDATE_CLASSPATHS, (address as AddressInfo).port);
		}
	});
}

export function deactivate() {
}
