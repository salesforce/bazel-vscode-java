// .vscode-test.js
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig([
  {
    installExtensions: ['redhat.java@prerelease'],
    workspaceFolder: 'test/projects/small',
    files: 'out/test/**/*.test.js'
  }
]);