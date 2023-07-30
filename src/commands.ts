'use strict';

/**
 * Commonly used commands
 */
export namespace Commands {
	/**
	 * Update classpaths of one or more Bazel projects
	 */
	export const UPDATE_CLASSPATHS = 'java.bazel.updateClasspaths';
	export const UPDATE_CLASSPATHS_CMD = 'java.bazel.updateClasspaths.command';

	/**
	 * Synchronize all projects of a Bazel workspace
	 */
	export const SYNC_PROJECTS = 'java.bazel.syncProjects';
	export const SYNC_PROJECTS_CMD = 'java.bazel.syncProjects.command';

	/**
	 * Execute Workspace Command (copied form vscode-java)
	 */
	export const EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
}