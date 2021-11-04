
import * as vscode from 'vscode';

export class BazelTaskProvider implements vscode.TaskProvider {

	static BazelType = 'bazel';
	private bazelPromise: Thenable<vscode.Task[]> | undefined = undefined;

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.bazelPromise) {
			this.bazelPromise = getBazelTasks();
		}
		return this.bazelPromise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const task = _task.definition.task;
		if (task) {
			// resolveTask requires that the same definition object be used.
			const definition: BazelTaskDefinition = <any>_task.definition;
			return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.name, definition.type, new vscode.ShellExecution(`${definition.task}`));
		}
		return undefined;
	}

}

interface BazelTaskDefinition extends vscode.TaskDefinition {

}

async function getBazelTasks(): Promise<vscode.Task[]> {

	const tasksDefenitions: BazelTaskDefinition[] = [];

	tasksDefenitions.push(
		{
			type: 'bazel',
			name: 'Build',
			task: 'bazel build //...'
		}
	);

	tasksDefenitions.push(
		{
			type: 'bazel',
			name: 'Test',
			task: 'bazel test //...'
		}
	);

	tasksDefenitions.push(
		{
			type: 'bazel',
			name: 'Dependencies',
			task: 'bazel query  --notool_deps --noimplicit_deps \"deps(//...)\" --output graph'
		}
	);

	tasksDefenitions.push(
		{
			type: 'bazel',
			name: 'Formatting',
			task: 'buildifier -r . && echo \"Formatted\"'
		}
	);

	tasksDefenitions.push(
		{
			type: 'bazel',
			name: 'Unused deps',
			task: 'unused_deps //...'
		}
	);

	const result: vscode.Task[] = [];

	tasksDefenitions.forEach(function (value) {
		result.push(new vscode.Task(value, vscode.TaskScope.Workspace, `${value.name}`, `${value.type}`, new vscode.ShellExecution(`${value.task}`)));
	});

	return result;
}
