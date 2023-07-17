# Bazel extension for Java™️ Language Support for VS Code

[![Build](https://github.com/salesforce/bazel-vscode-java/actions/workflows/ci.yml/badge.svg)](https://github.com/salesforce/bazel-vscode-java/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/salesforce/bazel-vscode-java?style=for-the-badge)](https://github.com/salesforce/bazel-vscode-java/blob/master/LICENSE)

This extension adds support for Bazel to the Java™️ Language Support for VS Code.
It plugs into the Eclipse Java Language server and computes project dependencies and classpath information using Bazel `BUILD` files.

## Getting Started

Go and [install the extension](vscode:extension/sfdc.bazel-vscode-java) from the VSCode Marketplace (see [listing here](https://marketplace.visualstudio.com/items?itemName=sfdc.bazel-vscode-java)).

Once installed, open VSCode in any Bazel Workspace with Java targets.
The extension will look for a `WORKSPACE` (`WORKSPACE.bazel`) file to identify a Bazel workspace.
Next it will look for a `.bazelproject` file to look for directories and targets to resolve.
If no `.bazelproject` file can be found a default one will be created.
For details of the lookup sequence please have a look at the latest implementation of [`BazelProjectImporter.java`` in the language server](https://github.com/salesforce/bazel-eclipse/blob/0f526c8bd9cf970c4720240314b898218447ddc1/bundles/com.salesforce.bazel.eclipse.jdtls/src/main/java/com/salesforce/bazel/eclipse/jdtls/managers/BazelProjectImporter.java#L108).


