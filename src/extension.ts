import { dirname } from 'path';
import { ConfigurationTarget, ExtensionContext, FileSystemWatcher, FileType, StatusBarAlignment, ThemeColor, Uri, commands, window, workspace } from 'vscode';
import { BazelProjectView, readBazelProject } from './bazelprojectparser';
import { Commands } from './commands';
import { Log } from './log';
import { registerLSClient } from './loggingTCPServer';

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

	// Register commands

	context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, async () => {
        commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.SYNC_PROJECTS)
		.then(() => {
			Promise.allSettled([
				syncBazelProjectView(),
				commands.executeCommand<UpdateClasspathResponse>(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.LIST_SOURCEPATHS)
					.then((resp) => {
						const projects = new Set(resp.data.map(p => p.projectName));
						Log.info(`${projects.size} projects in classpath`);
						projects.forEach(project => {Log.trace(`${project} synced`);});
					}, (err: Error) => Promise.reject)
			])
			.catch(e => {Log.error(e.message);});
		});
    }));
	context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, async () => {
		outOfDateClasspaths.forEach(uri => {
			Log.info(`Updating classpath for ${uri.fsPath}`);
			commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.UPDATE_CLASSPATHS, uri.toString())
				.then(() => outOfDateClasspaths.delete(uri), (err: Error) => {Log.error(`${err.message}\n${err.stack}`);})
				.then(() => Log.info(`Classpath for ${uri.fsPath} updated`));
		});
		classpathStatus.hide();
    }));

	registerLSClient();

}

export function deactivate() {
	if(bazelBuildWatcher) {
		bazelBuildWatcher.dispose();
	}
	if(bazelProjectWatcher){
		bazelProjectWatcher.dispose();
	}
}

interface UpdateClasspathResponse {
	data: Array<ClasspathInfo>;
	status: boolean
}

interface ClasspathInfo {
	path: string;
	displayPath: string;
	classpathEntry: string;
	projectName: string;
	projectType: string;
}

interface ExcludeConfig {
	[x:string]: boolean;
}

function toggleBazelClasspathSyncStatus(uri: Uri){
	classpathStatus.show();
	classpathStatus.text = 'Sync bazel classpath';
	classpathStatus.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
	outOfDateClasspaths.add(uri);
}

async function syncBazelProjectView() {
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

// not sure we need this or not yet
async function cleanOldProjectFiles() {
	const workspaceRoot = getWorkspaceRoot();
	workspace.findFiles('**/\.project').then(val => {
		console.log(val);
	});
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