![GitHub Actions](https://github.com/salesforce/bazel-vscode/workflows/main/badge.svg)
[![](https://img.shields.io/badge/license-BSD%203-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Bazel for Java
===========================

Installation
--------------------
You can download the latest build from the [Releases](https://github.com/salesforce/bazel-vscode/releases) or package the extension by yourself:
1. [Install](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#installation) `vsce` CLI tool:
    ```bash
    npm install -g vsce
    ```
2. Clone the repository
    ```bash
    git clone git@github.com:salesforce/bazel-vscode.git
    ```
3. Install the dependencies:
    ```bash
    cd bazel-vscode
    npm install
    ```
4. Compile source code:
    ```bash
    npm run compile
    ```
5. Package the extension:
    ```bash
    vsce package
    ```
6. Open the _Extensions_ tab in VS Code
7. Select _Install from VSIX..._ and choose file built in the fourth step
8. Enable Bazel import and disable Maven import in VS Code settings (it can cause issues)
    ```
    {
        "java.import.bazel.enabled": true,
        "java.import.maven.enabled": false
    }
    ```
9. Check source and test paths on the project. By default, source path is ```/src/main/java``` and test path is ```/src/test/java```. If source and/or test paths differ from the default, then add actual path in VS Code settings
    ```
    {
        "java.import.bazel.src.path": "<path-to-source>",
        "java.import.bazel.test.path": "<path-to-test>"
    }
    ```
    e.g.:
    ```
    {
        "java.import.bazel.src.path": "/src/java",
        "java.import.bazel.test.path": "/src/tests"
    }
    ```
10. Once installed, restart VS Code


Task Provider
--------------------

You can use the example from the bazelTaskProvider.ts to create VSCode tasks.

The example provides tasks:

* Run 'Build' and 'Test' to run bazel build an test for all targets.

* Run 'Dependencies' query to creat all targets dependency graph.

* Run 'Formatting' to formatt all BUILD and WORKSPACE files. 

* Run 'Unused deps' to check unused dependencies.

NOTE! Tasks 'Formatting' and 'Unused deps' require [buildifier](https://github.com/bazelbuild/buildtools/blob/master/buildifier/README.md) and [unused deps](https://github.com/bazelbuild/buildtools/blob/master/unused_deps/README.md) installed respectively.


Remote Development
--------------------

If you are using Visual Studio Code Remote Development for work, please note that 'Bazel' and other additional tools must be installed on the server. 