import { existsSync } from 'fs';
import { join } from 'path';
import { format } from 'util';
import {
	ConfigurationTarget,
	ExtensionContext,
	FileType,
	StatusBarAlignment,
	TextDocument,
	ThemeColor,
	Uri,
	commands,
	extensions,
	tasks,
	window,
	workspace,
} from 'vscode';
import {
	BazelLanguageServerTerminal,
	getBazelTerminal,
} from './bazelLangaugeServerTerminal';
import { BazelTaskManager } from './bazelTaskManager';
import { getBazelProjectFile } from './bazelprojectparser';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import { registerLSClient } from './loggingTCPServer';
import { BazelRunTargetProvider } from './provider/bazelRunTargetProvider';
import { BazelTaskProvider } from './provider/bazelTaskProvider';
import { ExcludeConfig } from './types';
import {
	getWorkspaceRoot,
	initBazelProjectFile,
	isBazelWorkspaceRoot,
} from './util';

const classpathStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const projectViewStatus = window.createStatusBarItem(
	StatusBarAlignment.Left,
	1,
);
const outOfDateClasspaths: Set<Uri> = new Set<Uri>();
classpathStatus.command = Commands.UPDATE_CLASSPATHS_CMD;
projectViewStatus.command = Commands.SYNC_PROJECTS_CMD;
const workspaceRoot = getWorkspaceRoot();

export async function activate(context: ExtensionContext) {
	// activates
	// LS processes current .eclipse/.bazelproject file
	// if it DNE create one
	// register TCP port with LS
	// project view should reflect what's in the LS
	// show any directories listed in the .bazelproject file
	// fetch all projects loaded into LS and display those too
	// show both .vscode and .eclipse folders
	//

	window.registerTreeDataProvider(
		'bazelTaskOutline',
		BazelRunTargetProvider.instance,
	);
	tasks.registerTaskProvider('bazel', new BazelTaskProvider());

	BazelLanguageServerTerminal.trace('extension activated');

	workspace.onDidChangeTextDocument((event) => {
		const doc = event.document;
		if (doc.uri.fsPath.includes('bazelproject') && !doc.isDirty) {
			toggleBazelProjectSyncStatus(doc);
		}
		if (doc.uri.fsPath.includes('BUILD') && !doc.isDirty) {
			toggleBazelClasspathSyncStatus(doc);
		}
	});

	context.subscriptions.push(
		commands.registerCommand(
			Commands.OPEN_BAZEL_BUILD_STATUS_CMD,
			getBazelTerminal().show,
		),
	);

	commands.executeCommand(
		'setContext',
		'isBazelWorkspaceRoot',
		isBazelWorkspaceRoot(),
	);
	// create .eclipse/.bazelproject file is DNE
	if (isBazelWorkspaceRoot()) {
		initBazelProjectFile();
		const showBazelprojectConfig =
			workspace.getConfiguration('bazel.projectview');
		if (showBazelprojectConfig.get('open')) {
			openBazelProjectFile();
			showBazelprojectConfig.update('open', false); // only open this file on the first activation of this extension
		}
		syncBazelProjectView();
		context.subscriptions.push(
			commands.registerCommand(Commands.OPEN_BAZEL_PROJECT_FILE, () =>
				openBazelProjectFile(),
			),
		);
	}

	context.subscriptions.push(
		commands.registerCommand(Commands.SYNC_PROJECTS_CMD, syncProjectView),
	);
	context.subscriptions.push(
		commands.registerCommand(
			Commands.SYNC_DIRECTORIES_ONLY,
			syncBazelProjectView,
		),
	);
	context.subscriptions.push(
		commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, updateClasspaths),
	);
	context.subscriptions.push(
		commands.registerCommand(Commands.DEBUG_LS_CMD, runLSCmd),
	);
	context.subscriptions.push(
		commands.registerCommand(
			Commands.BAZEL_TARGET_REFRESH,
			BazelTaskManager.refreshTasks,
		),
	);
	context.subscriptions.push(
		commands.registerCommand(
			Commands.BAZEL_TARGET_RUN,
			BazelTaskManager.runTask,
		),
	);
	context.subscriptions.push(
		commands.registerCommand(
			Commands.BAZEL_TARGET_KILL,
			BazelTaskManager.killTask,
		),
	);

	// trigger a refresh of the tree view when any task get executed
	tasks.onDidStartTask((_) => BazelRunTargetProvider.instance.refresh());
	tasks.onDidEndTask((_) => BazelRunTargetProvider.instance.refresh());

	// always update the project view after the initial project load
	registerLSClient();
}

export function deactivate() {}

function syncProjectView(): void {
	if (!isRedhatJavaReady()) {
		window.showErrorMessage(
			'Unable to sync project view. Java language server is not ready',
		);
		return;
	}

	projectViewStatus.hide();
	executeJavaLanguageServerCommand(Commands.SYNC_PROJECTS).then(
		syncBazelProjectView,
	);
}

function updateClasspaths() {
	if (!isRedhatJavaReady()) {
		window.showErrorMessage(
			'Unable to update classpath. Java language server is not ready',
		);
		return;
	}
	outOfDateClasspaths.forEach((uri) => {
		BazelLanguageServerTerminal.info(`Updating classpath for ${uri.fsPath}`);
		executeJavaLanguageServerCommand(
			Commands.UPDATE_CLASSPATHS,
			uri.toString(),
		).then(
			() => outOfDateClasspaths.delete(uri),
			(err: Error) => {
				BazelLanguageServerTerminal.error(`${err.message}\n${err.stack}`);
			},
		);
	});
	classpathStatus.hide();
}

function runLSCmd() {
	if (!isRedhatJavaReady()) {
		window.showErrorMessage(
			'Unable to execute LS cmd. Java language server is not ready',
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
					(resp) => BazelLanguageServerTerminal.info(format(resp)),
					(err) => BazelLanguageServerTerminal.error(format(err)),
				);
			}
		});
}

function isRedhatJavaReady(): boolean {
	const javaExtension = extensions.getExtension('redhat.java')?.exports;
	if (javaExtension) {
		return javaExtension.status === 'Started';
	}
	return false;
}

function toggleBazelClasspathSyncStatus(doc: TextDocument) {
	classpathStatus.show();
	classpathStatus.text = 'Sync bazel classpath';
	classpathStatus.backgroundColor = new ThemeColor(
		'statusBarItem.warningBackground',
	);
	outOfDateClasspaths.add(doc.uri);
}

function toggleBazelProjectSyncStatus(doc: TextDocument) {
	projectViewStatus.show();
	projectViewStatus.text = 'Sync bazel project view';
	projectViewStatus.backgroundColor = new ThemeColor(
		'statusBarItem.warningBackground',
	);
}

async function syncBazelProjectView() {
	if (workspaceRoot) {
		BazelLanguageServerTerminal.debug('Syncing bazel project view');
		const displayFolders = new Set<string>(['.eclipse', '.vscode']); // TODO bubble this out to a setting
		try {
			const bazelProjectFile = await getBazelProjectFile();
			let viewAll = false;
			if (bazelProjectFile.directories.includes('.')) {
				viewAll = true;
			} else {
				bazelProjectFile.directories.forEach((d) => {
					const dirRoot = d.split('/').filter((x) => x)[0];
					displayFolders.add(dirRoot);
				});
				bazelProjectFile.targets.forEach((t) =>
					displayFolders.add(
						t.replace('//', '').replace(/:.*/, '').replace(/\/.*/, ''),
					),
				);
			}

			workspace.fs.readDirectory(Uri.parse(workspaceRoot)).then((val) => {
				const dirs = val.filter((x) => x[1] !== FileType.File).map((d) => d[0]);
				const excludeObj: ExcludeConfig = workspace
					.getConfiguration('files')
					.get('exclude') as ExcludeConfig;
				dirs.forEach(
					(d) => (excludeObj[d] = viewAll ? false : !displayFolders.has(d)),
				);
				workspace
					.getConfiguration('files')
					.update('exclude', excludeObj, ConfigurationTarget.Workspace);
			});
		} catch (err) {
			throw new Error(`Could not read bazelproject file: ${err}`);
		}
	}
}

function openBazelProjectFile() {
	try {
		const projectViewPath = join(workspaceRoot, '.eclipse', '.bazelproject');
		if (existsSync(projectViewPath)) {
			workspace
				.openTextDocument(projectViewPath)
				.then((f) => window.showTextDocument(f));
		} else {
			window.showErrorMessage(`${projectViewPath} does not exist`);
		}
	} catch (err) {
		window.showErrorMessage(
			'Unable to open the bazel project file; invalid workspace',
		);
	}
}
