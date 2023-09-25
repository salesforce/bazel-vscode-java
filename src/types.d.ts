export interface UpdateClasspathResponse {
	data: Array<ClasspathInfo>;
	status: boolean
}

export interface ClasspathInfo {
	path: string;
	displayPath: string;
	classpathEntry: string;
	projectName: string;
	projectType: string;
}

export interface ExcludeConfig {
	[x:string]: boolean;
}

export interface ParseConfig {
	root: string,
	imports: string[],
	projectView: BazelProjectView,
	processedImports: string[]
}

export interface BazelProjectView {
	directories: string[];
	targets: string[];
	deriveTargetsFromDirectories: boolean;
	workspaceType?: string;
	additionalLanguages?: string[];
	javaLanguageLevel?: string;
	tsConfigRules?: string[];
	importRunConfigurations?: string[];
	bazelBinary?: string;
	projectMappings?: string[];
	targetDiscoveryStrategy?: string;
	targetProvisioningStrategy?: string;
  }

export interface RawSection {
	name: string;
	body: string;
}
