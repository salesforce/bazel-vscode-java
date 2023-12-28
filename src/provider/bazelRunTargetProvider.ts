import {
	Command,
	Event,
	EventEmitter,
	ProviderResult,
	Task,
	TaskExecution,
	ThemeIcon,
	TreeDataProvider,
	TreeItem,
	TreeItemCollapsibleState,
	tasks,
} from 'vscode';

export class BazelRunTargetProvider
	implements TreeDataProvider<BazelRunTarget>
{
	private static _instance: BazelRunTargetProvider;

	private _onDidChangeTreeData: EventEmitter<
		BazelRunTarget | undefined | void
	> = new EventEmitter<BazelRunTarget | undefined | void>();
	readonly onDidChangeTreeData: Event<BazelRunTarget | undefined | void> =
		this._onDidChangeTreeData.event;

	private constructor() {}

	public static get instance(): BazelRunTargetProvider {
		if (!BazelRunTargetProvider._instance) {
			BazelRunTargetProvider._instance = new BazelRunTargetProvider();
		}
		return BazelRunTargetProvider._instance;
	}

	refresh(...args: any[]): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: BazelRunTarget): TreeItem | Thenable<TreeItem> {
		return element;
	}
	getChildren(
		element?: BazelRunTarget | undefined,
	): ProviderResult<BazelRunTarget[]> {
		return tasks
			.fetchTasks({ type: 'bazel' })
			.then((bt) =>
				bt.map((t) => new BazelRunTarget(t, TreeItemCollapsibleState.None)),
			);
	}
}

export class BazelRunTarget extends TreeItem {
	public readonly task: Task | undefined;
	public readonly execution: TaskExecution | undefined;

	constructor(
		task: Task,
		collapsibleState: TreeItemCollapsibleState,
		command?: Command,
	) {
		super(task.name, collapsibleState);
		this.task = task;
		this.command = command;
		this.execution = tasks.taskExecutions.find(
			(e) => e.task.name === this.task?.name && e.task.source === task.source,
		);
		this.contextValue = this.execution ? 'runningTask' : 'task';
		if (this.execution) {
			this.iconPath = new ThemeIcon('sync~spin');
		}
	}
}
