import { join } from 'path';
import { format } from 'util';
import { ConfigurationTarget, ExtensionContext, FileType, StatusBarAlignment, TextDocument, ThemeColor, Uri, commands, extensions, tasks, window, workspace } from 'vscode';
import { BazelLanguageServerTerminal, getBazelTerminal } from './bazelLangaugeServerTerminal';
import { BazelTaskProvider } from './bazelTaskProvider';
import { getBazelProjectFile } from './bazelprojectparser';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import { registerLSClient } from './loggingTCPServer';
import { ExcludeConfig, UpdateClasspathResponse } from './types';
import { getWorkspaceRoot, initBazelProjectFile } from './util';

const classpathStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const projectViewStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);
const outOfDateClasspaths: Set<Uri> = new Set<Uri>();
classpathStatus.command = Commands.UPDATE_CLASSPATHS_CMD;
projectViewStatus.command = Commands.SYNC_PROJECTS_CMD;
const rootPath = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
		? workspace.workspaceFolders[0].uri.fsPath : undefined;

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

	tasks.registerTaskProvider('bazel', new BazelTaskProvider());

	BazelLanguageServerTerminal.trace('extension activated');

	workspace.onDidChangeTextDocument(event => {
		const doc = event.document;
		if(doc.uri.fsPath.includes('bazelproject') && !doc.isDirty) {
			toggleBazelProjectSyncStatus(doc);
		}
		if(doc.uri.fsPath.includes('BUILD') && !doc.isDirty) {
			toggleBazelClasspathSyncStatus(doc);
		}
	});

	context.subscriptions.push(commands.registerCommand(Commands.OPEN_BAZEL_BUILD_STATUS_CMD, getBazelTerminal().show));

	// create .eclipse/.bazelproject file is DNE
	if(rootPath){
		initBazelProjectFile(rootPath);
		workspace.openTextDocument(join(rootPath, '.eclipse', '.bazelproject'))
			.then(f => window.showTextDocument(f));
	}

	context.subscriptions.push(commands.registerCommand(Commands.SYNC_PROJECTS_CMD, syncProjectView));
	context.subscriptions.push(commands.registerCommand(Commands.UPDATE_CLASSPATHS_CMD, updateClasspaths));
	context.subscriptions.push(commands.registerCommand(Commands.DEBUG_LS_CMD, runLSCmd));

	// always update the project view after the initial project load
	registerLSClient().then(() => syncBazelProjectView());
}

export function deactivate() { }

async function syncProjectView(): Promise<void> {
	if(!isRedhatJavaReady()){
		window.showErrorMessage('Unable to sync project view. Java language server is not ready');
		return;
	}

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
}

function updateClasspaths() {
	if(!isRedhatJavaReady()){
		window.showErrorMessage('Unable to update classpath. Java language server is not ready');
		return;
	}
	outOfDateClasspaths.forEach(uri => {
		BazelLanguageServerTerminal.info(`Updating classpath for ${uri.fsPath}`);
		executeJavaLanguageServerCommand(Commands.UPDATE_CLASSPATHS, uri.toString())
			.then(() => outOfDateClasspaths.delete(uri), (err: Error) => {BazelLanguageServerTerminal.error(`${err.message}\n${err.stack}`);});
	});
	classpathStatus.hide();
}

function runLSCmd() {
	if(!isRedhatJavaReady()){
		window.showErrorMessage('Unable to execute LS cmd. Java language server is not ready');
		return;
	}
	window.showInputBox({
		value: Commands.JAVA_LS_LIST_SOURCEPATHS
	}).then(cmd => {
		if(cmd) {
			const [lsCmd, args] = cmd.trim().split(/\s(.*)/s);
			executeJavaLanguageServerCommand<any>(lsCmd, args)
				.then(resp => BazelLanguageServerTerminal.info(format(resp)), err => BazelLanguageServerTerminal.error(format(err)));
		}
	});
}

function isRedhatJavaReady(): boolean {
	const javaExtension = extensions.getExtension('redhat.java')?.exports;
	console.log();
	if(javaExtension) {
		return javaExtension.status === 'Started';
	}
	return false;
}

function toggleBazelClasspathSyncStatus(doc: TextDocument){
	classpathStatus.show();
	classpathStatus.text = 'Sync bazel classpath';
	classpathStatus.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
	outOfDateClasspaths.add(doc.uri);
}

function toggleBazelProjectSyncStatus(doc: TextDocument){
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
