import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ShellExecution, Task, TaskDefinition, TaskProvider, TaskScope } from 'vscode';
import { BazelLanguageServerTerminal } from '../bazelLangaugeServerTerminal';
import { getBazelProjectFile } from '../bazelprojectparser';
import { getWorkspaceRoot } from '../util';

const parser = new XMLParser({ignoreAttributes : false, allowBooleanAttributes: true});

export class BazelTaskProvider implements TaskProvider {

	static BazelType = 'bazel';
	private bazelPromise: Thenable<Task[]> | undefined = undefined;

	public provideTasks(): Thenable<Task[]> | undefined {
		if (!this.bazelPromise) {
			this.bazelPromise = getBazelTasks();
		}
		return this.bazelPromise;
	}

	public resolveTask(task: Task): Task | undefined {
		const taskDef = task.definition.task;
		if (taskDef) {
			// resolveTask requires that the same definition object be used.
			const definition: BazelTaskDefinition = <any>task.definition;
			return new Task(definition, task.scope ?? TaskScope.Workspace, definition.name, definition.type, new ShellExecution(`${definition.task}`));
		}
		return undefined;
	}

}

class BazelTaskDefinition implements TaskDefinition {
	type = 'bazel';
	name: string;
	task: string;

	constructor(name: string, task: string) {
		this.name = name;
		this.task = task;
	}

}

async function getBazelTasks(): Promise<Task[]> {

	// setup default bazel tasks
	const taskDefinitions: BazelTaskDefinition[] = [];

	// add any ij converted run targets to vscode tasks
	const bazelProjectFile = await getBazelProjectFile();
	if((bazelProjectFile).importRunConfigurations) {
		const rootPath = getWorkspaceRoot();
		bazelProjectFile.importRunConfigurations.forEach(runConfig => {
			const rconf = getIJRunConfig(join(rootPath, runConfig));
			if(rconf){
				taskDefinitions.push(rconf);
			}
		});
	}

	return taskDefinitions.map((value) => new Task(value, TaskScope.Workspace, `${value.name}`, `${value.type}`, new ShellExecution(`${value.task}`), []));
}

function getIJRunConfig(configPath: string): BazelTaskDefinition | undefined {
	let ijRunConfig = parser.parse(readFileSync(configPath, {encoding: 'utf-8'}));
	if(typeof(ijRunConfig) === 'object'){
		if('configuration' in ijRunConfig){
			if('@_type' in ijRunConfig.configuration && ijRunConfig.configuration['@_type'] === 'BlazeCommandRunConfigurationType'){
				return new BazelTaskDefinition(
					ijRunConfig.configuration['@_name'],
					`bazel ${ijRunConfig.configuration['blaze-settings']['@_blaze-command']} ${ijRunConfig.configuration['blaze-settings']['blaze-target']}`);
			}
		}
	}
	BazelLanguageServerTerminal.warn(`failed to convert intellj run config: ${configPath}}`);
	return undefined;
}
