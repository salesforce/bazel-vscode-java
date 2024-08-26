import { writeFileSync } from 'fs';
import {
	commands,
	ConfigurationTarget,
	FileType,
	Uri,
	window,
	workspace,
} from 'vscode';
import { BazelLanguageServerTerminal } from './bazelLangaugeServerTerminal';
import { getBazelProjectFile } from './bazelprojectparser';
import { ExcludeConfig, FileWatcherExcludeConfig } from './types';
import { getVscodeConfig, getWorkspaceRoot } from './util';

export namespace ProjectViewManager {
	const workspaceRoot = getWorkspaceRoot();
	const workspaceRootName = workspaceRoot.split('/').reverse()[0];

	function isMultiRoot(): boolean {
		return !!workspace.workspaceFile;
	}

	/**
	 * Utility method to convert a single root workspace to a multi-root
	 */
	export function covertToMultiRoot() {
		if (!isMultiRoot()) {
			window
				.showWarningMessage(
					'This will convert your project to a multi-root project. After this operation completes your window will be reloaded',
					'Proceed',
					'Cancel'
				)
				.then(async (action) => {
					if (action === 'Proceed') {
						const workspaceFile = {
							folders: [{ path: '.eclipse' }],
							settings: await getVscodeConfig('settings').then(cleanSettings),
							launch: await getVscodeConfig('launch'),
							tasks: await getVscodeConfig('tasks'),
							extensions: await getVscodeConfig('extensions'),
						};
						writeFileSync(
							`${workspaceRoot}/${workspaceRootName}.code-workspace`,
							Buffer.from(JSON.stringify(workspaceFile, null, 2))
						);

						// reload the window using the new workspace
						commands.executeCommand(
							'vscode.openFolder',
							Uri.file(`${workspaceRoot}/${workspaceRootName}.code-workspace`)
						);
					}
					return;
				});
		} else {
			window.showInformationMessage(
				'This project is already in multi-root mode.'
			);
		}
	}

	export async function updateProjectView() {
		BazelLanguageServerTerminal.debug('Syncing bazel project view');

		getDisplayFolders().then((df) => {
			if (isMultiRoot()) {
				return updateMultiRootProjectView(df)
					.then(rootDirOnly)
					.then(updateFileWatcherExclusion);
			}
			return updateSingleRootProjectView(rootDirOnly(df)).then(
				updateFileWatcherExclusion
			);
		});
	}

	async function getDisplayFolders(): Promise<string[]> {
		let displayFolders = new Set<string>(['.eclipse']); // TODO bubble this out to a setting
		try {
			const bazelProjectFile = await getBazelProjectFile();
			if (bazelProjectFile.directories.includes('.')) {
				displayFolders = new Set<string>(['.']);
			} else {
				bazelProjectFile.directories.forEach((d) => {
					displayFolders.add(d);
				});
				bazelProjectFile.targets.forEach((t) =>
					displayFolders.add(
						t.replace('//', '').replace(/:.*/, '').replace(/\/.*/, '')
					)
				);
			}

			return [...displayFolders];
		} catch (err) {
			throw new Error(`Could not read bazelproject file: ${err}`);
		}
	}

	function updateSingleRootProjectView(
		displayFolders: string[]
	): Thenable<string[]> {
		const viewAll = displayFolders.includes('.');
		const workspaceFilesConfig = workspace.getConfiguration('files');
		return workspace.fs
			.readDirectory(Uri.parse(workspaceRoot))
			.then((val) => val.filter((x) => x[1] !== FileType.File).map((d) => d[0]))
			.then((dirs) => {
				const filesExclude = workspaceFilesConfig.get(
					'exclude'
				) as ExcludeConfig;
				dirs.forEach(
					(d) =>
						(filesExclude[d] = viewAll ? false : !displayFolders.includes(d))
				);
				return filesExclude;
			})
			.then((filesExclude) =>
				workspaceFilesConfig.update(
					'exclude',
					filesExclude,
					ConfigurationTarget.Workspace
				)
			)
			.then(() => displayFolders);
	}

	function updateMultiRootProjectView(
		displayFolders: string[]
	): Thenable<string[]> {
		workspace.updateWorkspaceFolders(
			0,
			workspace.workspaceFolders?.length,
			...displayFolders.map((f) => {
				const moduleUri = Uri.file(`${workspaceRoot}/${f}`);
				let moduleName = f;
				if (moduleName === '.') {
					moduleName = workspaceRootName;
				}
				if (f.includes('/')) {
					moduleName = f.replaceAll('/', ' ⇾ ');
				}
				return {
					uri: moduleUri,
					name: moduleName,
				};
			})
		);
		return Promise.resolve(displayFolders);
	}

	function updateFileWatcherExclusion(
		displayFolders: string[]
	): Thenable<void> {
		const workspaceFilesConfig = workspace.getConfiguration('files');
		BazelLanguageServerTerminal.debug('updating files.watcherExclude setting');

		const filesWatcherExclude =
			workspaceFilesConfig.get<FileWatcherExcludeConfig>('watcherExclude', {});

		const fileWatcherKeys = Object.keys(filesWatcherExclude);
		const hasOldEntry = fileWatcherKeys.filter((k) =>
			k.includes('.eclipse')
		).length;

		const viewAll = displayFolders.includes('.');

		const fileWatcherExcludePattern = viewAll
			? ''
			: `**/!(${Array.from(displayFolders.sort()).join('|')})/**`;

		if (viewAll) {
			// if viewAll and existing config doesn't contain .eclipse return
			if (!hasOldEntry) {
				return Promise.resolve();
			}
		} else {
			// if !viewAll and existing config contains identical entry return
			if (fileWatcherKeys.includes(fileWatcherExcludePattern)) {
				return Promise.resolve();
			}
		}

		// copy the old config obj, but remove any previous exclude based on the .bazelproject file
		const newFilesWatcherExclude: FileWatcherExcludeConfig = {};
		for (const val in filesWatcherExclude) {
			if (!val.includes('.eclipse')) {
				newFilesWatcherExclude[val] = filesWatcherExclude[val];
			}
		}

		if (fileWatcherExcludePattern) {
			newFilesWatcherExclude[fileWatcherExcludePattern] = true;
		}

		return workspaceFilesConfig
			.update('watcherExclude', newFilesWatcherExclude)
			.then((x) =>
				window
					.showWarningMessage(
						'File watcher exclusions are out of date. Please reload the window to apply the change',
						...['Reload', 'Ignore']
					)
					.then((opt) => {
						if (opt === 'Reload') {
							commands.executeCommand('workbench.action.reloadWindow');
						}
						if (opt === 'Ignore') {
							workspace
								.getConfiguration('bazel.projectview')
								.update('updateFileWatcherExclusion', false);
						}
					})
			);
	}

	/**
	 *
	 * @param settingsObj used to clear the 'old' files.exclude entry that
	 * was used to modify the project view
	 * @returns
	 */
	function cleanSettings(settingsObj: Object | undefined): Object | undefined {
		if (settingsObj) {
			if ('files.exclude' in settingsObj) {
				delete settingsObj['files.exclude'];
			}
		}

		return settingsObj;
	}

	function rootDirOnly(dirs: string[]): string[] {
		return dirs.map((d) => d.split('/')[0]);
	}
}
