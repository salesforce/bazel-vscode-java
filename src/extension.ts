import { setTimeout } from 'timers/promises';
import { format } from 'util';
import {
	ExtensionContext,
	commands,
	extensions,
	window,
	workspace,
} from 'vscode';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import {
	BazelJavaExtensionAPI,
	BazelVscodeExtensionAPI,
} from './extension.api';
import { registerLSClient } from './loggingTCPServer';
import { outputLog } from './util';

const BAZEL_EXTENSION_NAME = 'sfdc-eng.bazel-vscode';

export async function activate(
	context: ExtensionContext
): Promise<BazelJavaExtensionAPI> {
	const bazelExtension =
		extensions.getExtension<BazelVscodeExtensionAPI>(
			BAZEL_EXTENSION_NAME
		)?.exports;

	if (bazelExtension) {
		// always update the project view after the initial project load
		registerLSClient(bazelExtension.bazelTerminal);

		context.subscriptions.push(
			commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, updateClasspaths)
		);
		context.subscriptions.push(
			commands.registerCommand(Commands.DEBUG_LS_CMD, runLSCmd)
		);
	}

	return Promise.resolve({
		sync: syncProjectView,
	});
}

export function deactivate() {}

async function syncProjectView(): Promise<void> {
	if (!(await isRedhatJavaReady(true))) {
		window.showErrorMessage(
			'Unable to sync project view. Java language server is not ready'
		);
		return;
	}

	const launchMode = workspace
		.getConfiguration('java.server')
		.get('launchMode');
	// if the launchMode is not Standard it should be changed and the window reloaded to apply that change
	if (!launchMode || launchMode !== 'Standard') {
		workspace
			.getConfiguration('java.server')
			.update('launchMode', 'Standard')
			.then(() => commands.executeCommand('workbench.action.reloadWindow'));
	}

	executeJavaLanguageServerCommand(Commands.SYNC_PROJECTS);
}

async function updateClasspaths() {
	if (!(await isRedhatJavaReady(true))) {
		window.showErrorMessage(
			'Unable to update classpath. Java language server is not ready'
		);
		return;
	}
}

async function runLSCmd() {
	if (!(await isRedhatJavaReady(true))) {
		window.showErrorMessage(
			'Unable to execute LS cmd. Java language server is not ready'
		);
		return;
	}
	window
		.showInputBox({
			value: Commands.JAVA_LS_LIST_SOURCEPATHS,
		})
		.then((cmd) => {
			if (cmd) {
				const [lsCmd, args] = cmd.trim().split(/\s(.*)/s);
				executeJavaLanguageServerCommand<any>(lsCmd, args).then(
					(resp) => outputLog.info(format(resp)),
					(err) => outputLog.error(format(err))
				);
			}
		});
}

async function isRedhatJavaReady(wait = false, retry = 5): Promise<boolean> {
	const javaExtension = extensions.getExtension('redhat.java')?.exports;

	if (javaExtension) {
		if (javaExtension.status === 'Started') {
			return true;
		}
	}

	if (wait) {
		await setTimeout(1000);
		return isRedhatJavaReady(true, retry - 1);
	}

	return false;
}
