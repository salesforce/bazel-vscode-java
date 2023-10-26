import { dirname } from 'path';
import { TextEncoder } from 'util';
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
const projectViewRelativePath = '.eclipse/.bazelproject';

export function activate(context: ExtensionContext) {

	cloneTemplateProjectView(getWorkspaceRoot());

	bazelBuildWatcher = workspace.createFileSystemWatcher('**/BUILD.bazel');
	bazelProjectWatcher = workspace.createFileSystemWatcher('**/.bazelproject');

	bazelBuildWatcher.onDidChange(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidCreate(toggleBazelClasspathSyncStatus);
	bazelBuildWatcher.onDidDelete(toggleBazelClasspathSyncStatus);

	bazelProjectWatcher.onDidChange(syncBazelProjectView);

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
					}, (err: Error) => Promise.reject)
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

// not sure we need this or not yet
async function cleanOldProjectFiles() {
	const workspaceRoot = getWorkspaceRoot();
	workspace.findFiles('**/\.project').then(val => {
		console.log(val);
	});
}

async function getBazelProjectFile(workspaceRoot: string): Promise<BazelProjectView> {
	const bazelProjectExists = await bazelProjectFileExists(workspaceRoot);
	if(bazelProjectExists) {
		return readBazelProject(projectViewRelativePath);
	}
	throw new Error(`${projectViewRelativePath} does not exist`)
}

async function bazelProjectFileExists(workspaceRoot: string): Promise<boolean> {
	try {
	 	const bazelProjectFileStat = await workspace.fs.stat(Uri.parse(`${workspaceRoot}/${projectViewRelativePath}`));
		if (bazelProjectFileStat.type === FileType.File) {
			return true;
		}
		throw new Error(`${projectViewRelativePath} type is ${bazelProjectFileStat.type}, should be ${FileType.File}`);
	} catch {
		return false;
	}
}

const eclipseManagedImport = new TextEncoder().encode("# import default settings (never remove this line 🙏)\n"+
							 "import tools/eclipse/.managed-defaults.bazelproject\n");

async function cloneTemplateProjectView(workspaceRoot: string) {
	try {
		const bazelProjectExists = await bazelProjectFileExists(workspaceRoot);
		if (!bazelProjectExists) {
			//Carry over from the IntelliJ bazel implementation
			const managedProjectViewUri = Uri.parse(`${workspaceRoot}/tools/intellij/.managed.bazelproject`);
			const eclipseManagedProjectViewUri = Uri.parse(`${workspaceRoot}/tools/eclipse/.managed-defaults.bazelproject`);
			let managedProjectView;
			try {
				managedProjectView = await workspace.fs.stat(managedProjectViewUri);
			} catch {
				//If the managed project view does not exist, there is nothing for us to clone
				return;
			}
			if (managedProjectView.type === FileType.File) {
				var contents = await workspace.fs.readFile(managedProjectViewUri);
				try {
					const eclipseManagedProjectView = await workspace.fs.stat(eclipseManagedProjectViewUri);
					if (eclipseManagedProjectView.type === FileType.File) {
						contents = new Uint8Array([...eclipseManagedImport, ...contents]);
					}
				} catch {
					//File does not exist, which is fine
				}
				try {
					workspace.fs.writeFile(Uri.parse(`${workspaceRoot}/${projectViewRelativePath}`), contents);
				} catch (err) {
					Log.warn(`Unable to write managed project view content to ${projectViewRelativePath}: ${err}`);
				}
				
			}
		}
	} catch(err) {
		Log.warn(`Failed to clone managed template view: ${err}`);
	}
}