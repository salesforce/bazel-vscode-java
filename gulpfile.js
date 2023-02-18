// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const gulp = require('gulp');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const bazelEclipseDir = path.join(__dirname, 'bazel-eclipse');

gulp.task('build-plugin', (done) => {
  fs.readdirSync(__dirname).forEach((file, index) => {
    if (file.match('.*bazel-vscode-.*\\.vsix')) {
      fs.unlinkSync(file);
    }
  });

  if (!fs.existsSync(bazelEclipseDir)) {
    fs.mkdirSync(bazelEclipseDir);

    // del.sync(bazelEclipseDir + '/**', { force: true });
    fs.rmdirSync(bazelEclipseDir, { recursive: true });

    cp.execSync('git clone https://github.com/salesforce/bazel-eclipse.git', {
      cwd: __dirname,
      stdio: [0, 1, 2],
    });
  }

  cp.execSync(mvnw() + ' clean package', { cwd: bazelEclipseDir, stdio: [0, 1, 2] });
  renameTarget('com.salesforce.b2eclipse.jdt.ls');
  renameTarget('com.salesforce.bazel.eclipse.common');
  renameTarget('com.salesforce.bazel-java-sdk');
  done();
});

function isWin() {
  return /^win/.test(process.platform);
}

function mvnw() {
  return isWin() ? 'mvnw.cmd' : './mvnw';
}

function renameTarget(plugin) {
  bundlesPath = path.join(bazelEclipseDir, 'bundles');
  pluginPath = path.join(bundlesPath, plugin);
  targetPath = path.join(pluginPath, 'target');
  sourceFileName = fs.readdirSync(targetPath).find(file => file.match(plugin + '-.*-SNAPSHOT\\.jar'));
  sourceFile = path.join(targetPath, sourceFileName);
  targetFile = path.join(targetPath, plugin + '.jar');
  fs.renameSync(sourceFile, targetFile);
}

