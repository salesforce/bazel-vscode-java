import path from 'path';
import {
	Event,
	EventEmitter,
	FileSystemWatcher,
	ProviderResult,
	RelativePattern,
	ThemeIcon,
	TreeDataProvider,
	TreeItem,
	TreeItemCollapsibleState,
	Uri,
	workspace,
} from 'vscode';
import { getWorkspaceRoot } from '../util';

const WORKSPACE_ROOT = getWorkspaceRoot();

export class RootFileViewProvider implements TreeDataProvider<string> {
	private static _instance: RootFileViewProvider;

	private _filesWatcher: FileSystemWatcher;
	private _onDidChangeTreeData: EventEmitter<string | undefined | void> =
		new EventEmitter<string | undefined | void>();
	readonly onDidChangeTreeData: Event<string | undefined | void> =
		this._onDidChangeTreeData.event;

	private constructor() {
		this._filesWatcher = workspace.createFileSystemWatcher(
			new RelativePattern(WORKSPACE_ROOT, '*')
		);
		this._filesWatcher.onDidChange((f) => this._onDidChangeTreeData.fire());
		this._filesWatcher.onDidCreate((f) => this._onDidChangeTreeData.fire());
		this._filesWatcher.onDidDelete((f) => this._onDidChangeTreeData.fire());
	}

	public static get instance(): RootFileViewProvider {
		if (!this._instance) {
			this._instance = new RootFileViewProvider();
		}
		return this._instance;
	}

	getTreeItem(element: string): TreeItem | Thenable<TreeItem> {
		return new FileItem(element);
	}
	getChildren(element?: string | undefined): ProviderResult<string[]> {
		if (!element) {
			return workspace.fs
				.readDirectory(Uri.file(WORKSPACE_ROOT))
				.then((val) => {
					return val.filter((v) => v[1] === 1).map((v) => v[0]);
				});
		}
		return [];
	}
}

class FileItem extends TreeItem {
	constructor(fileName: string, collapsibleState?: TreeItemCollapsibleState) {
		super(fileName, collapsibleState);
		this.command = {
			title: fileName,
			command: 'vscode.open',
			arguments: [Uri.file(`${WORKSPACE_ROOT}${path.sep}${fileName}`)],
		};
		switch (fileName.split('.').reverse()[0]) {
			case 'json':
				this.iconPath = new ThemeIcon('json');
				break;
			default:
				this.iconPath = new ThemeIcon('file');
				break;
		}
	}
}
