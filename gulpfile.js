// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

const gulp = require('gulp');
const cp = require('child_process');
const decompress = require('gulp-decompress');
const download = require('gulp-download');
const rename = require('gulp-rename');
const filter = require('gulp-filter');
const gRegexRename = require('gulp-regex-rename');
const request = require('request');
const glob = require('glob');
const fse = require('fs-extra');
const path = require('path');
const url = require("url");
const argv = require('minimist')(process.argv.slice(2));
const BAZEL_ECLIPSE_DIR = '../bazel-eclipse';
const BAZEL_ECLIPSE_LATEST_URL = "https://opensource.salesforce.com/bazel-eclipse/latest/p2-repository.zip";
const NON_NPM_REPOSITORY_RE = new RegExp(
  String.raw`"resolved":\s*"https://(?!(registry\.npmjs\.org\/?))`,
  "g"
);

// a little helper to drop OSGi versions from bundle jar file name
const DROP_JAR_VERSION = gRegexRename(/_\d+\.\d+\.\d+(\.[^\.]+)?\.jar/, '.jar');

// read the package.json once so we can use it in the gulp script
const packageJson = JSON.parse(fse.readFileSync("./package.json").toString());

// we only need the headless jars of the Bazel JDT Language Server extension
const declaredServerJars = new Set(packageJson.contributes.javaExtensions.map(path => path.split('/').reverse()[0]));
const jarIsIncludedInPackageJson = filter(file => {
  return declaredServerJars.has(file.basename);
});

gulp.task('download_server', function (done) {
  downloadServerImpl();
  done();
});

gulp.task('build_server', function (done) {
  buildServerImpl();
  done();
});

gulp.task('build_or_download', function (done) {
  if (!fse.existsSync(BAZEL_ECLIPSE_DIR)) {
    console.log('NOTE: bazel-eclipse is not found as a sibling directory, downloading the latest snapshot of the Bazel JDT Language Server extension...');
    downloadServerImpl();
  }
  else {
    buildServerImpl();
  }
  done();
});

gulp.task('prepare_pre_release', function (done) {
	// parse existing version (using ECMA script regex from https://semver.org/)
	const stableVersion = packageJson.version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/);
	const major = stableVersion[1];
	const minor = stableVersion[2];
	// unfortunately, VS Code Marketplace does not support full semver
	// thus, we use a patch that is based on year up to the minute
	const date = new Date();
	const year = date.getUTCFullYear() - 2000;
	const month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const hours = date.getUTCHours();
	const minutes = date.getUTCMinutes();
	const patch = `${year}${prependZero(month)}${prependZero(day)}${prependZero(hours)}${prependZero(minutes)}`;
	const insiderPackageJson = Object.assign(packageJson, {
		version: `${major}.${minor}.${patch}`,
	});
	fse.writeFileSync("./package.json", JSON.stringify(insiderPackageJson, null, "\t"));
	done();
});

gulp.task('repo_check', function (done) {
	const data = fse.readFileSync("./package-lock.json", { encoding: "utf-8" });

	if (NON_NPM_REPOSITORY_RE.test(data)) {
		done(new Error("Found references to the internal registry in the file package-lock.json. Please fix it with replacing all URLs using 'https://registry.npmjs.org'!"));
	} else {
		done();
	}
});

function isWin() {
  return /^win/.test(process.platform);
}

function isMac() {
  return /^darwin/.test(process.platform);
}

function isLinux() {
  return /^linux/.test(process.platform);
}

function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}

function prependZero(num) {
	if (num > 99) {
		throw new Error("Unexpected value to prepend with zero");
	}
	return `${num < 10 ? "0" : ""}${num}`;
}

function downloadServerImpl() {
  fse.removeSync('./server');
  download(BAZEL_ECLIPSE_LATEST_URL)
    .pipe(decompress())
    .pipe(filter(['plugins/*.jar']))
    .pipe(rename(function (path) {
      return {
        dirname: "", // flatten
        basename: path.basename,
        extname: path.extname
      };
    }))
    .pipe(DROP_JAR_VERSION)
    .pipe(jarIsIncludedInPackageJson)
    .pipe(gulp.dest('./server'));
}

function buildServerImpl() {
  fse.removeSync('./server');
  cp.execSync(mvnw() + ' clean package -DskipTests=true', { cwd: BAZEL_ECLIPSE_DIR, stdio: [0, 1, 2] });
  gulp.src(BAZEL_ECLIPSE_DIR + '/releng/p2repository/target/repository/plugins/*.jar')
    .pipe(DROP_JAR_VERSION)
    .pipe(jarIsIncludedInPackageJson)
    .pipe(gulp.dest('./server'));
}

