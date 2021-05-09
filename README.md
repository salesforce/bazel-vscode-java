![GitHub Actions](https://github.com/salesforce/bazel-ls-vscode/workflows/main/badge.svg)
[![](https://img.shields.io/badge/license-BSD%203-blue.svg)](https://opensource.org/licenses/BSD-3-Clause)

Bazel for Java
===========================

Installation
--------------------
You can download the latest build from the [Releases](https://github.com/salesforce/bazel-ls-vscode/releases) or package the extension by yourself:
1. [Install](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#installation) `vsce` CLI tool:
    ```bash
    npm install -g vsce
    ```
2. Clone the repository
    ```bash
    git clone git@github.com:salesforce/bazel-ls-vscode.git
    ```
3. Install the dependencies:
    ```bash
    cd bazel-ls-vscode
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
8. Once installed, restart VS Code
