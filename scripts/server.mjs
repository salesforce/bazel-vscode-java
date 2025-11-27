#!/usr/bin/env node

// forked from https://github.com/redhat-developer/vscode-java/blob/c7014730bcb07ee664eea2af34747613736a81ec/scripts/server.mjs

/* eslint-disable no-underscore-dangle */

import fs from 'fs-extra';
import { glob } from 'glob';
import path from 'path';
import unzip from 'unzipper';
import { downloadFile, getScriptDir, handleError, setupMainExecution } from './utils.mjs';

const dirname = getScriptDir();

const serverDir = path.join(dirname, '..', '..', 'bazel-eclipse');
const BAZEL_ECLIPSE_LATEST_URL = 'https://opensource.salesforce.com/bazel-eclipse/latest/p2-repository.zip';

// a little helper to drop OSGi versions from bundle jar file name
const JAR_VERSION_SUFFIX = /_\d+\.\d+\.\d+(\.[^\.]+)?\.jar/;
function jarNameWithoutVersion(filePath) {
    return filePath.split('/').pop().replace(JAR_VERSION_SUFFIX, '.jar');
}

// read the package.json once so we can use it in the gulp script
const packageJson = JSON.parse(fs.readFileSync('./package.json').toString());

// we only need the headless jars of the Bazel JDT Language Server extension
const declaredServerJars = new Set(
    packageJson.contributes.javaExtensions.map(
        (path) => path.split('/').reverse()[0]
    )
);
function jarIsIncludedInPackageJson(jarName) {
    return declaredServerJars.has(jarName);
}

function isWin() {
    return /^win/.test(process.platform);
}

function mvnw() {
    return isWin() ? "mvnw.cmd" : "./mvnw";
}

async function downloadServer() {
    console.log('Downloading latest Bazel JDT Language Server extension release...');

    fs.removeSync('./server');
    fs.ensureDirSync('./server');

    const tempFile = path.join(dirname, 'temp-server.zip');

    try {
        await downloadFile(BAZEL_ECLIPSE_LATEST_URL, tempFile);

        // extract only the plugin jars that are declared in package.json
        const directory = await unzip.Open.file(tempFile);
        const filesToExtract = directory.files.filter(file =>
            file.path.startsWith('plugins/') &&
            jarIsIncludedInPackageJson(jarNameWithoutVersion(file.path))
        );
        await Promise.all(filesToExtract.map(async file => {
            const destPath = path.join('./server', jarNameWithoutVersion(file.path));
            fs.ensureDirSync(path.dirname(destPath));
            return new Promise((resolve, reject) => {
                file.stream()
                    .pipe(fs.createWriteStream(destPath))
                    .on('finish', resolve)
                    .on('error', reject);
            });
        }));

        fs.removeSync(tempFile);

        console.log('Successfully downloaded and extracted Bazel JDT Language Server extension');
    } catch (error) {
        handleError(error, 'downloading server');
    }
}

async function buildServer() {
    console.log('Building Bazel JDT Language Server extension...');

    fs.removeSync('./server');
    fs.ensureDirSync('./server');

    try {
        const command = `${mvnw()}  clean package -DskipTests=true`;
        console.log(`Executing: ${command}`);
        execSync(command, { cwd: serverDir, stdio: [0, 1, 2] });

        const sources = await glob(`${serverDir}/releng/p2repository/target/repository/plugins/*.jar`);

        // filter the jars that are included in the package.json
        const jarsToCopy = sources.filter(source => jarIsIncludedInPackageJson(jarNameWithoutVersion(source)));
        if (jarsToCopy.length > 0) {
            // copy the jars to the server directory
            await Promise.all(jarsToCopy.map(async source => {
                return await fs.copy(source, path.join('./server', jarNameWithoutVersion(source)));
            }));
            console.log('Successfully built and copied Bazel JDT Language Server extension');
        } else {
            throw new Error('No server jars found after build');
        }
    } catch (error) {
        handleError(error, 'building server', false);
        throw error;
    }
}

async function buildOrDownload() {
    if (!fs.existsSync(serverDir)) {
        console.log('NOTE: bazel-eclipse is not found as a sibling directory, downloading the latest snapshot of the Bazel JDT Language Server extension...');
        await downloadServer();
    } else {
        await buildServer();
    }
}

// Main execution
async function main() {
    const command = process.argv[2];

    switch (command) {
        case 'download':
            await downloadServer();
            break;
        case 'build':
            await buildServer();
            break;
        case 'build-or-download':
            await buildOrDownload();
            break;
        default:
            console.log('Usage: node server.js [download|build|build-or-download|dev|watch]');
            process.exit(1);
    }
}

setupMainExecution(main);

export { buildOrDownload, buildServer, downloadServer };
