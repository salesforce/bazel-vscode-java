import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { workspace } from 'vscode';

const BAZELPROJECT_TEMPLATE = `
# The project view file (.bazelproject) is used to import targets into the IDE.
#
# See: https://ij.bazel.build/docs/project-views.html
#
# This files provides a default experience for developers working with the project.
# You should customize it to suite your needs.

directories:
  .  # import everything (remove the dot if this is too much)

derive_targets_from_directories: true
`;

export function getWorkspaceRoot(): string {
	if(workspace.workspaceFile) {
		return dirname(workspace.workspaceFile.path);
	} else {
		if(workspace.workspaceFolders){
			return workspace.workspaceFolders[0].uri.path;
		}
	}
	throw new Error('No workspace found');
}

export function initBazelProjectFile(workspaceRoot: string){
	if(existsSync(join(workspaceRoot, '.eclipse', '.bazelproject'))){
		return;
	}

	mkdirSync(join(workspaceRoot, '.eclipse'), {recursive: true});
	writeFileSync(join(workspaceRoot, '.eclipse', '.bazelproject'), BAZELPROJECT_TEMPLATE);
}