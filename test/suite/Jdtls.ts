// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
// copied from https://github.com/jdneo/vscode-java-dependency/blob/86e7b60e8dd17a7bcaf0c39fe9dbcd5e8cf236d9/src/java/jdtls.ts

import {
	Commands,
	executeJavaExtensionCommand,
	executeJavaLanguageServerCommand,
} from '../../src/commands';
import { UpdateClasspathResponse } from '../../src/types';

export namespace Jdtls {
	export function getSourcePaths(): Thenable<UpdateClasspathResponse> {
		return executeJavaLanguageServerCommand(Commands.JAVA_LS_LIST_SOURCEPATHS);
	}

	export function buildWorkspace(): Thenable<CompileWorkspaceStatus> {
		return executeJavaExtensionCommand(Commands.JAVA_BUILD_WORKSPACE, false);
	}

	export enum CompileWorkspaceStatus {
		Failed = 0,
		Succeed = 1,
		Witherror = 2,
		Cancelled = 3,
	}
}
