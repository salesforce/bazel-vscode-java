'use strict';

import { commands } from "vscode";

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
	export const SYNC_DIRECTORIES_ONLY = 'java.bazel.syncDirectoriesOnly.command';

	/**
	 * Connect our output window
	 */
	export const REGISTER_BAZEL_TCP_SERVER_PORT = 'java.bazel.connectProcessStreamSocket';

	// commands copied from vscode-java for interaction with JDT LS
	export const EXECUTE_WORKSPACE_COMMAND = 'java.execute.workspaceCommand';
	export const JAVA_LS_LIST_SOURCEPATHS = 'java.project.listSourcePaths';

	// commands copied from vscode-java for interaction with the extension
	export const JAVA_BUILD_WORKSPACE = "java.workspace.compile";
	export const JAVA_CLEAN_WORKSPACE = "java.clean.workspace";

	export const GET_ALL_JAVA_PROJECTS = 'java.project.getAll';

	export const DEBUG_LS_CMD = 'java.bazel.debug.command';

	export const OPEN_BAZEL_BUILD_STATUS_CMD = 'java.bazel.showStatus';

	export const BAZEL_TARGET_REFRESH = 'bazelTaskOutline.refresh';
	export const BAZEL_TARGET_RUN = 'bazelTaskOutline.run';
	export const BAZEL_TARGET_KILL = 'bazelTaskOutline.kill';
}

export function executeJavaLanguageServerCommand<T = unknown>(...rest: any[]): Thenable<T> {
	return executeJavaExtensionCommand(Commands.EXECUTE_WORKSPACE_COMMAND, ...rest);
}

export function executeJavaExtensionCommand<T = unknown>(commandName: string, ...rest: any[]): Thenable<T> {
	return commands.executeCommand(commandName, ...rest);
}
