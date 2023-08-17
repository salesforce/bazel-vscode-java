import { existsSync, readFileSync } from 'fs';
import { workspace } from 'vscode';
import { Log } from './log';

const COMMENT_REGEX = /#(.)*(\n|\z)/gm;
const HEADER_REGEX = /^[^:\-\/*\s]+[: ]/gm;
const WHITESPACE_CHAR_REGEX = /\s+/;
const EXCLUDED_ENTRY_PREFIX = "-";

interface ParseConfig {
	root: string,
	imports: string[],
	projectView: BazelProjectView,
	processedImports: string[]
}

function parseProjectFile(config: ParseConfig): BazelProjectView {

	let current: string|undefined;
	while(current = config.imports.pop()){
		let filePath = `${config.root}/${current}`;
		if(existsSync(filePath)){
			if(config.processedImports.includes(current)){
				throw new Error(`Recursive import detected for file ${current}, ${config.processedImports.join('-> ')}`);
			}
			config.processedImports.push(current);

			let fileContent = readFileSync(filePath, { encoding: "utf-8" });
			fileContent = removeComments(fileContent);

			const rawSections = parseRawSections(fileContent).forEach(section => {
				switch(section.name) {
					case 'directories':
						config.projectView.directories = Array.from(new Set(config.projectView.directories.concat(parseAsList(section.body).filter((s) => !s.startsWith(EXCLUDED_ENTRY_PREFIX)))));
						break;
					case 'targets':
						config.projectView.targets = Array.from(new Set(config.projectView.targets.concat(parseAsList(section.body).filter((s) => !s.startsWith(EXCLUDED_ENTRY_PREFIX)))));
						break;
					case 'import':
						config.imports = config.imports.concat(parseAsList(section.body));
						break;
					case 'derive_targets_from_directories':
						config.projectView.deriveTargetsFromDirectories = parseAsBoolean(section.body);
						break;
					case 'workspace_type':
						config.projectView.workspaceType = section.body;
						break;
					case 'additional_languages':
						config.projectView.additionalLanguages = (Array.isArray(config.projectView.additionalLanguages))
							? config.projectView.additionalLanguages.concat(parseAsList(section.body))
							: parseAsList(section.body);
						break;
					case 'java_language_level':
						config.projectView.javaLanguageLevel = section.body;
						break;
					case 'ts_config_rules':
						config.projectView.tsConfigRules = (Array.isArray(config.projectView.tsConfigRules))
							? config.projectView.tsConfigRules.concat(parseAsList(section.body))
							: parseAsList(section.body);
						break;
					case 'import_run_configurations':
						config.projectView.importRunConfigurations = (Array.isArray(config.projectView.importRunConfigurations))
							? config.projectView.importRunConfigurations.concat(parseAsList(section.body))
							: parseAsList(section.body);
						break;
					case 'bazel_binary':
						config.projectView.bazelBinary = section.body;
						break;
					case 'project_mappings':
						config.projectView.projectMappings = (Array.isArray(config.projectView.projectMappings))
							? config.projectView.projectMappings.concat(section.body)
							: parseAsList(section.body);
						break;
					case 'target_discovery_strategy':
						config.projectView.targetDiscoveryStrategy = section.body;
						break;
					case 'target_provisioning_strategy':
						config.projectView.targetProvisioningStrategy = section.body;
						break;
					default:
						Log.warn(`unexpected section '${section.name}' while reading '${current}'`);
				}
			});
		} else {
			Log.warn(`unable to resolve import ${current}`);
		}
	}

	return config.projectView;

}

function parseAsList(value: string): string[] {
	return value.split(WHITESPACE_CHAR_REGEX).filter((v) => v !== "");
}

function parseAsBoolean(value: string) {
	return /true/i.test(value);
}

function parseRawSections(projectFileContents: string): RawSection[] {
  const result = new Array<RawSection>();

  let headers = projectFileContents
    .match(HEADER_REGEX)
    ?.map(h => h.replace(':', ''))
	?.map(h => h.trim());


  let bodies = projectFileContents.split(HEADER_REGEX);

  if (headers?.length !== bodies.length - 1) {
    throw new Error(
      `Syntax error in .bazelproject: The number of section headers doesn't match the number of section bodies (${
        headers?.length
      } != ${bodies.length}; header: ${headers?.join(",")}).`
    );
  }

  headers.forEach((value, idx) =>
    result.push({ name: value, body: bodies[idx + 1].trim() })
  );

  return result;
}

function removeComments(bazelProjectFileContent: string): string {
  return bazelProjectFileContent.replace(COMMENT_REGEX, "\n");
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

interface RawSection {
  name: string;
  body: string;
}

export function readBazelProject(bazelProjectFile: string): BazelProjectView {
  return parseProjectFile({
	root: (workspace.workspaceFolders) ? workspace.workspaceFolders[0].uri.fsPath : './',
	imports: [bazelProjectFile],
	projectView: {directories: [], targets: [], deriveTargetsFromDirectories: false},
	processedImports: []
  });
}