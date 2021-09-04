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

 removeFolder(bazelEclipseDir);

 cp.execSync('git clone https://github.com/salesforce/bazel-eclipse.git', { cwd: __dirname, stdio: [0, 1, 2] });
 cp.execSync(`mvn clean package`, { cwd: bazelEclipseDir, stdio: [0, 1, 2] });
 done();
});

function isWin() {
  return /^win/.test(process.platform);
}

function mvnw() {
  return isWin() ? 'mvnw.cmd' : './mvnw';
}

function removeFolder(folder) {
  if (fs.existsSync(folder)) {
    fs.readdirSync(folder).forEach((file, index) => {
      var child = path.join(folder, file);
      if (fs.statSync(child).isDirectory()) {
        removeFolder(child);
      } else {
        fs.unlinkSync(child);
      }
    });
    fs.rmdirSync(folder);
  }
}
