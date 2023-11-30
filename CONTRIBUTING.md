# Contribution Guide

## Setup

For a proper development setup there are four components required:

1. This VSCode extension (Bazel VSCode Java)
2. [The Bazel JDT Language Server extension](https://github.com/salesforce/bazel-eclipse)
3. [The RedHat VSCode Java extension](https://github.com/redhat-developer/vscode-java)
4. [The Eclipse JDT Language Server](https://github.com/eclipse-jdtls/eclipse.jdt.ls)

The model we follow here is follows the pattern found in the RedHat VSCode Java extension.
Allthough steps 3 and 4 are optional, they are highly recommended for a full setup which allows contributions upstream to those.

All repositories must be cloned into the same parent directory, i.e. they all must be siblings and use the default directory name.

## Build
This project uses [esbuild](https://esbuild.github.io/) for bundling and standard vscode tooling to generate vsix packages. The relevant targets you should be aware of are:
- `npm run build`
	- compiles everything under the `src` dir and downloads/builds any of the required `jar` files. Setups everything required to package the extension.
- `npm run test`
	- compiles everything under the `test` dir and executes any [mocha](https://mochajs.org/) test found
- `npm run lint`
	- runs [eslint](https://eslint.org/) against everything in the `src` folder.
- `npm run analyze`
	- analyzes the project and displays a report. Useful for understanding how the project is structured
- `npm run package`
	- uses [vsce](https://github.com/microsoft/vscode-vsce) to generate a VSIX artifact

* The bulk of the build is handled via the `build.ts` wrapper script. This script encapsulates all of our defaults used in bundling the project. If you need to tweak the way the build works you should start first in the `package.json` -> `scripts` subsection, then the `build.ts` script.

## VSCode Launch configs
We have several different launch config setup for this project. All are used for slightly different uses cases.

- `Launch Extension - Remote Server`
	- launch the extension and debug against a remote java runtime (running on port 3333)
- `Launch Bazel VSCode Java Extension - JDTLS Client`
	- launch the extension and use a separately running eclipse LS (running on port 5036)
- `Launch Bazel VSCode Java Extension`
	- launch the extension in it's default configuration.
- `Launch Bazel VSCode WITH RedHat Java Extension`
	- launch the extension and use the redhat java extension stored in the shared parent directory
- `Run Bazel Extension Tests`
	- execute all mocha tests

## Best Practices

* Always run `npm run test` before pushing/creating a PR
* Always run `npm run lint` before pushing/creating a PR

## Release

