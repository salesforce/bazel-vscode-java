import { existsSync, lstatSync, readdirSync } from 'fs';
import * as path from 'path';
import { CancellationToken, Command, Event, EventEmitter, FileSystemWatcher, ProviderResult, RelativePattern, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window, workspace } from 'vscode';
import { Commands, executeJavaLanguageServerCommand } from './commands';
import { UpdateClasspathResponse } from './types';

const SYNCED = 'synced';
const UNSYNCED = 'unsynced';

export class BazelSyncStatusProvider implements TreeDataProvider<SyncStatus> {

	private _onDidChangeTreeData: EventEmitter<SyncStatus | undefined | void> = new EventEmitter<SyncStatus | undefined | void>();
	readonly onDidChangeTreeData: Event<SyncStatus | undefined | void> = this._onDidChangeTreeData.event;
	private treeData: SyncStatus[] = [];

	constructor(private workspaceRoot: string | undefined) {
		this.workspaceRoot = workspaceRoot;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SyncStatus): TreeItem | Thenable<TreeItem> {
		return element;
	}
	getChildren(element?: SyncStatus | undefined): ProviderResult<SyncStatus[]> {
		if(!this.workspaceRoot){
			window.showInformationMessage('empty workspace');
			return Promise.resolve([]);
		}

		// we never have children of children, so we only care about the case where no element is passed in
		if(!element){

			if(!this.treeData || !this.treeData.length) {
				return this.buildTreeData();
			}

			return Promise.resolve(this.treeData);
		}

		return Promise.resolve([]);

	}
	getParent?(element: SyncStatus): ProviderResult<SyncStatus> {
		throw new Error('Method not implemented.');
	}
	resolveTreeItem?(item: TreeItem, element: SyncStatus, token: CancellationToken): ProviderResult<TreeItem> {
		throw new Error('Method not implemented.');
	}

	buildTreeData(): Promise<SyncStatus[]> {
		return new Promise((resolve, reject) => {
			executeJavaLanguageServerCommand<UpdateClasspathResponse>(Commands.JAVA_LS_LIST_SOURCEPATHS)
				.then(resp => {
					this.treeData = resp.data.map(cp => {
						const moduleBuildFile = getModuleBuildFile(cp.path);
						return new SyncStatus(
							cp.projectName,
							workspace.createFileSystemWatcher(new RelativePattern(path.dirname(moduleBuildFile), 'BUILD*')),
							TreeItemCollapsibleState.None,
							{title: 'sync module', command: Commands.UPDATE_CLASSPATHS_CMD, arguments: [moduleBuildFile]});
						});
					resolve(this.treeData);
				}, err => reject(err));
		});
	}

	clearTreeData() {
		this.treeData.forEach(td => {
			td.watcher.dispose();
		});
		this.treeData = [];
	}
}

export class SyncStatus extends TreeItem {

	public modifiedBuildFiles: Set<Uri> = new Set();

	constructor(
		public readonly label: string,
		public readonly watcher: FileSystemWatcher,
		public readonly collapsibleState: TreeItemCollapsibleState,
		public readonly command?: Command
	) {
		super(label, collapsibleState);
		this.tooltip = this.label;
		this.description = SYNCED;

		this.watcher.onDidChange(uri => {
			this.modifiedBuildFiles.add(uri);
			this.description = UNSYNCED;
		});

	}

	iconPath = {
		light: path.join(__filename, '..', 'resources', 'light', 'pass.svg'),
		dark: path.join(__filename, '..', 'resources', 'dark', 'pass.svg')
	};

	clearState(){
		this.modifiedBuildFiles.clear();
		this.description = SYNCED;
	}

}

// from a given starting dir, walk up the file tree until a BUILD file is found. return it
function getModuleBuildFile(projectPath: string): string {
	if(existsSync(projectPath)){
		if(lstatSync(projectPath).isDirectory()) {
			for(let x of readdirSync(projectPath)){
				if(lstatSync(path.join(projectPath, x)).isFile() && x.includes('BUILD')) {
					return path.join(projectPath, x);
				}
			}
		}
	} else {
		throw new Error(`invalide path: ${projectPath}`);
	}
	return getModuleBuildFile(path.dirname(projectPath));
}
