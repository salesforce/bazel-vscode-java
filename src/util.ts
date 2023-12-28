import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { workspace } from 'vscode';

// TODO: pull this template out into a file
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
	if (workspace.workspaceFile) {
		return dirname(workspace.workspaceFile.path);
	} else {
		if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
			return workspace.workspaceFolders[0].uri.path;
		}
	}
	throw new Error('invalid workspace root');
}

export function initBazelProjectFile() {
	const workspaceRoot = getWorkspaceRoot();
	if (existsSync(join(workspaceRoot, '.eclipse', '.bazelproject'))) {
		return;
	}

	// only create a project view file if there's a bazel WORKSPACE file present in the workspace root
	if (isBazelWorkspaceRoot()) {
		mkdirSync(join(workspaceRoot, '.eclipse'), { recursive: true });
		writeFileSync(
			join(workspaceRoot, '.eclipse', '.bazelproject'),
			BAZELPROJECT_TEMPLATE,
		);
	}
}

export function isBazelWorkspaceRoot(): boolean {
	const workspaceRoot = getWorkspaceRoot();
	return (
		existsSync(join(workspaceRoot, 'WORKSPACE')) ||
		existsSync(join(workspaceRoot, 'WORKSPACE.bazel'))
	);
}
