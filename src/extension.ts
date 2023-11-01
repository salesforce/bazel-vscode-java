import { join } from 'path';
import { format } from 'util';
import { ConfigurationTarget, ExtensionContext, FileSystemWatcher, FileType, StatusBarAlignment, ThemeColor, Uri, commands, tasks, window, workspace } from 'vscode';
import { BazelLanguageServerTerminal, getBazelTerminal } from './bazelLangaugeServerTerminal';
import { BazelTaskProvider } from './bazelTaskProvider';
import { getBazelProjectFile } from './bazelprojectparser';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import { registerLSClient } from './loggingTCPServer';
import { ExcludeConfig, UpdateClasspathResponse } from './types';
import { getWorkspaceRoot, initBazelProjectFile } from './util';

let bazelBuildWatcher: FileSystemWatcher;
let bazelProjectWatcher: FileSystemWatcher;
const classpathStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const projectViewStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const outOfDateClasspaths: Set<Uri> = new Set<Uri>();
classpathStatus.command = Commands.UPDATE_CLASSPATHS_CMD;
projectViewStatus.command = Commands.SYNC_PROJECTS_CMD;


export function activate(context: ExtensionContext) {

	// activates
	// LS processes current .eclipse/.bazelproject file
		// if it DNE create one
	// register TCP port with LS
	// project view should reflect what's in the LS
		// show any directories listed in the .bazelproject file
		// fetch all projects loaded into LS and display those too
		// show both .vscode and .eclipse folders
	//

	const rootPath = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
		? workspace.workspaceFolders[0].uri.fsPath : undefined;

	tasks.registerTaskProvider('bazel', new BazelTaskProvider());

	bazelBuildWatcher = workspace.createFileSystemWatcher('**/BUILD.bazel');
	bazelProjectWatcher = workspace.createFileSystemWatcher('**/.bazelproject');

	bazelBuildWatcher.onDidChange(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidCreate(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidDelete(toggleBazelClasspathSyncStatus);

	bazelProjectWatcher.onDidChange(toggleBazelProjectSyncStatus);

	BazelLanguageServerTerminal.trace('extension activated');

	context.subscriptions.push(commands.registerCommand(Commands.OPEN_BAZEL_BUILD_STATUS_CMD, () => {
		getBazelTerminal().show();
	}));

	// create .eclipse/.bazelproject file is DNE
	if(rootPath){
		initBazelProjectFile(rootPath);
		workspace.openTextDocument(join(rootPath, '.eclipse', '.bazelproject'))
			.then(f => window.showTextDocument(f));
	}

	registerLSClient().then(() => {

		// always update the project view after the initial project load
		syncBazelProjectView();

		// Register commands here; we don't want to execute them until the TCP port is registered with the LS
		context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, async () => {
			projectViewStatus.hide();
			try {
				await executeJavaLanguageServerCommand(Commands.SYNC_PROJECTS);
				syncBazelProjectView();
			} catch(err) {
				if(err instanceof Error) {
					BazelLanguageServerTerminal.error(err.message);
				}
				BazelLanguageServerTerminal.error(format(err));
			}
		}));

		context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, () => {
			outOfDateClasspaths.forEach(uri => {
				BazelLanguageServerTerminal.info(`Updating classpath for ${uri.fsPath}`);
				executeJavaLanguageServerCommand(Commands.UPDATE_CLASSPATHS, uri.toString())
					.then(() => outOfDateClasspaths.delete(uri), (err: Error) => {BazelLanguageServerTerminal.error(`${err.message}\n${err.stack}`);});
			});
			classpathStatus.hide();
		}));

		context.subscriptions.push(commands.registerCommand(Commands.DEBUG_LS_CMD, () => {
			window.showInputBox({
				value: Commands.JAVA_LS_LIST_SOURCEPATHS
			}).then(cmd => {
				if(cmd) {
					const [lsCmd, args] = cmd.trim().split(/\s(.*)/s);
					executeJavaLanguageServerCommand<any>(lsCmd, args)
						.then(resp => BazelLanguageServerTerminal.info(format(resp)), err => BazelLanguageServerTerminal.error(format(err)));
				}
			});
		}));

	});
}

export function deactivate() {
	if(bazelBuildWatcher) {
		bazelBuildWatcher.dispose();
	}
	if(bazelProjectWatcher){
		bazelProjectWatcher.dispose();
	}

}

function toggleBazelClasspathSyncStatus(uri: Uri){
	classpathStatus.show();
	classpathStatus.text = 'Sync bazel classpath';
	classpathStatus.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
	outOfDateClasspaths.add(uri);
}

function toggleBazelProjectSyncStatus(uri: Uri){
	projectViewStatus.show();
	projectViewStatus.text = 'Sync bazel project view';
	projectViewStatus.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
}

async function syncBazelProjectView() {
	BazelLanguageServerTerminal.debug('Syncing bazel project view');
	try {
		const bazelProjectFile = await getBazelProjectFile();

		const lsSourcePaths = await executeJavaLanguageServerCommand<UpdateClasspathResponse>(Commands.JAVA_LS_LIST_SOURCEPATHS);

		const displayFolders = ['.vscode', '.eclipse'] // TODO: bubble this out to a setting
			.concat(bazelProjectFile.directories)
			.concat(lsSourcePaths.data.map(cpath => cpath.projectName.replace(/:.+/g, '')));

		workspace.fs.readDirectory(Uri.parse(getWorkspaceRoot())).then(val => {
			let dirs = val.filter(x => x[1] !== FileType.File).map(d => d[0]);
			let excludeObj:ExcludeConfig = workspace.getConfiguration('files', ).get('exclude') as ExcludeConfig;
			dirs.forEach(d => excludeObj[d] = !displayFolders.includes(d));
			workspace.getConfiguration('files').update('exclude', excludeObj, ConfigurationTarget.Workspace);
		});
	} catch(err) {
		throw new Error(`Could not read bazelproject file: ${err}`);
	}
}
