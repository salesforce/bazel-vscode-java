
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
			return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.task, 'bazel', new vscode.ShellExecution(`bazel ${definition.task}`));
		}
		return undefined;
	}

}

interface BazelTaskDefinition extends vscode.TaskDefinition {

}

async function getBazelTasks(): Promise<vscode.Task[]> {
    const result: vscode.Task[] = [];

    const kind: BazelTaskDefinition = {
        type: 'bazel',
    };

	result.push(new vscode.Task(kind, vscode.TaskScope.Workspace, 'Build', 'bazel', new vscode.ShellExecution(`bazel build //...`)));
	result.push(new vscode.Task(kind, vscode.TaskScope.Workspace, 'Test', 'bazel', new vscode.ShellExecution(`bazel test //...`)));
	result.push(new vscode.Task(kind, vscode.TaskScope.Workspace, 'Dependencies', 'bazel', new vscode.ShellExecution(`bazel query  --notool_deps --noimplicit_deps \"deps(//...)\" --output graph`)));

    return result;
}
