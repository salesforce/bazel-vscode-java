// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const gulp = require('gulp');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const bazelEclipseDir = path.join(__dirname, 'bazel-eclipse');

gulp.task('build-plugin', (done) => {
  
  // if( fs.existsSync(mvnCmd) ){
  //  cp.execSync('git fetch origin', {cwd: serverDir, stdio: [0, 1, 2]  });
  //  cp.execSync('git pull origin --force', {cwd: serverDir, stdio: [0, 1, 2]  });
  // }else{
  //  cp.execSync('git clone https://github.com/salesforce/bazel-ls-eclipse.git', { cwd: __dirname, stdio: [0, 1, 2] });
  // }
  
  cp.execSync(`mvn clean package`, { cwd: bazelEclipseDir, stdio: [0, 1, 2] });
  done();
});

function isWin() {
  return /^win/.test(process.platform);
}

function mvnw() {
  return isWin() ? 'mvnw.cmd' : './mvnw';
}
