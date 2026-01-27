import { exec } from 'child_process';
import {
	languages,
	Range,
	TextDocument,
	TextEdit,
	window,
	workspace,
} from 'vscode';
import { getWorkspaceRoot } from './util';

export function registerBuildifierFormatter() {
	languages.registerDocumentFormattingEditProvider(
		{ scheme: 'file', language: 'starlark' },
		{
			async provideDocumentFormattingEdits(
				document: TextDocument
			): Promise<TextEdit[]> {
				if (
					workspace.getConfiguration('bazel.buildifier').get('enable', false)
				) {
					try {
						if (await buildifierExists()) {
							const updatedContent = await runBuildifier(document.fileName);

							// only return an edit if there is a value in `updatedContent`
							return !!updatedContent
								? [
										TextEdit.replace(
											new Range(
												0,
												0,
												document.lineCount - 1,
												document.lineAt(
													document.lineCount - 1
												).rangeIncludingLineBreak.end.character
											),
											updatedContent
										),
									]
								: [];
						}
					} catch (err) {
						window.showErrorMessage(`${err}`);
						return [];
					}
				}

				return [];
			},
		}
	);
}

function buildifierExists(): Promise<boolean> {
	return new Promise((resolve, reject) => {
		exec(
			`${getBuildifierCmd()} -version`,
			{ cwd: getWorkspaceRoot() },
			(err, stdout, stderr) => {
				if (err) {
					return reject(err);
				}
				return resolve(!stderr);
			}
		);
	});
}

/**
 * Utility function used to fetch the formatted text from the `buildifier`
 * cmd. Uses `exec` since we want to get all of the cmd response in a single
 * text blob
 * @param bazelFile
 * @returns
 */
function runBuildifier(bazelFile: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(
			`${getBuildifierCmd()} -mode print_if_changed ${workspace.asRelativePath(bazelFile)}`,
			{
				cwd: getWorkspaceRoot(),
			},
			(err, stdout, stderr) => {
				if (err) {
					console.error(stderr);
					return reject(err);
				}
				return resolve(stdout);
			}
		);
	});
}

function getBuildifierCmd(): string {
	return workspace.getConfiguration('bazel.buildifier').get('binary')
		? workspace.getConfiguration('bazel.buildifier').get('binary', 'buildifier')
		: 'buildifier';
}
