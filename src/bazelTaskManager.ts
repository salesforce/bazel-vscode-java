import { tasks } from 'vscode';
import { BazelRunTarget, BazelRunTargetProvider } from "./provider/bazelRunTargetProvider";

export namespace BazelTaskManager {
	export function refreshTasks() {
		BazelRunTargetProvider.instance.refresh();
	}

	export function runTask(bazelTarget: BazelRunTarget) {
		tasks.executeTask(bazelTarget.task!);
	}

	export function killTask(bazelTarget: BazelRunTarget) {
		bazelTarget.execution?.terminate();
	}
}
