# Contribution Guide

## Setup

For a proper development setup there are four components required:

1. This VSCode extension (Bazel VSCode Java)
2. The Bazel JDT Language Server extension
3. The RedHat VSCode Java extension
4. The Eclipse JDT Language Server

The model we follow here is follows the pattern found in the RedHat VSCode Java extension.
Allthough steps 3 and 4 are optional, they are highly recommended for a full setup which allows contributions upstream to those.

All repositories must be cloned into the same parent directory, i.e. they all must be siblings and use the default directory name.


## Best Practices

* Always run `npm run test` before pushing/creating a PR

## Release

