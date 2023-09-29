import { dirname } from 'path';
import { ConfigurationTarget, ExtensionContext, FileSystemWatcher, FileType, StatusBarAlignment, ThemeColor, Uri, commands, window, workspace } from 'vscode';
import { readBazelProject } from './bazelprojectparser';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import { Log } from './log';
import { registerLSClient } from './loggingTCPServer';
import { BazelProjectView, ExcludeConfig, UpdateClasspathResponse } from './types';

let bazelBuildWatcher: FileSystemWatcher;
let bazelProjectWatcher: FileSystemWatcher;
const classpathStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const outOfDateClasspaths: Set<Uri> = new Set<Uri>();
classpathStatus.command = Commands.UPDATE_CLASSPATHS_CMD;

export function activate(context: ExtensionContext) {

	bazelBuildWatcher = workspace.createFileSystemWatcher('**/BUILD.bazel');
	bazelProjectWatcher = workspace.createFileSystemWatcher('**/.bazelproject');

	bazelBuildWatcher.onDidChange(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidCreate(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidDelete(toggleBazelClasspathSyncStatus);

	bazelProjectWatcher.onDidChange(syncBazelProjectView);

	registerLSClient().then(() => {
		// Register commands
		context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, async () => {
			executeJavaLanguageServerCommand(Commands.SYNC_PROJECTS)
			.then(() => {
				Promise.allSettled([
					syncBazelProjectView(),
					executeJavaLanguageServerCommand<UpdateClasspathResponse>(Commands.JAVA_LS_LIST_SOURCEPATHS)
						.then((resp) => {
							const projects = new Set(resp.data.map(p => p.projectName));
							Log.info(`${projects.size} projects in classpath`);
							projects.forEach(project => {Log.trace(`${project} synced`);});
						}, (err: Error) => Log.error(err.message))
				])
				.catch(e => {Log.error(e.message);});
			});
		}));
		context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, async () => {
			outOfDateClasspaths.forEach(uri => {
				Log.info(`Updating classpath for ${uri.fsPath}`);
				executeJavaLanguageServerCommand(Commands.UPDATE_CLASSPATHS, uri.toString())
					.then(() => outOfDateClasspaths.delete(uri), (err: Error) => {Log.error(`${err.message}\n${err.stack}`);})
					.then(() => Log.info(`Classpath for ${uri.fsPath} updated`));
			});
			classpathStatus.hide();
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

async function syncBazelProjectView() {
	Log.debug('Syncing bazel project view');
	try {
		const workspaceRoot = getWorkspaceRoot();
		let bazelProjectFile = await getBazelProjectFile(workspaceRoot);

		workspace.fs.readDirectory(Uri.parse(workspaceRoot)).then(val => {
			let dirs = val.filter(x => x[1] !== FileType.File).map(d => d[0]);
			let excludeObj:ExcludeConfig = workspace.getConfiguration('files', ).get('exclude') as ExcludeConfig;
			dirs.forEach(d => excludeObj[d] = !bazelProjectFile.directories.includes(d));
			workspace.getConfiguration('files').update('exclude', excludeObj, ConfigurationTarget.Workspace);
		});
	} catch(err) {
		throw new Error(`Could not read bazelproject file: ${err}`);
	}
}

function getWorkspaceRoot(): string {
	if(workspace.workspaceFile) {
		return dirname(workspace.workspaceFile.path);
	} else {
		if(workspace.workspaceFolders){
			return workspace.workspaceFolders[0].uri.path;
		}
	}
	throw new Error('No workspace found');
}

async function getBazelProjectFile(workspaceRoot: string): Promise<BazelProjectView> {
	try{
		const bazelProjectFileStat = await workspace.fs.stat(Uri.parse(`${workspaceRoot}/.eclipse/.bazelproject`));
		if(bazelProjectFileStat.type === FileType.File) {
			return readBazelProject(`.eclipse/.bazelproject`);
		}
		throw new Error(`.eclipse/.bazelproject type is ${bazelProjectFileStat.type}, should be ${FileType.File}`);
	} catch(err) {
		throw new Error(`Could not read .eclipse/.bazelproject file: ${err}`);
	}
}