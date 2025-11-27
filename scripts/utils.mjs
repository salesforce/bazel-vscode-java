#!/usr/bin/env node

// forked from https://github.com/redhat-developer/vscode-java/blob/c7014730bcb07ee664eea2af34747613736a81ec/scripts/utils.mjs

import { createWriteStream } from 'fs';
import fs from 'fs-extra';
import https from 'https';
import path from 'path';
import { pipeline } from 'stream';
import * as tar from 'tar';
import unzip from 'unzipper';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';

const pipelineAsync = promisify(pipeline);

/**
 * Downloads a file from a URL to a destination path
 * @param {string} url - The URL to download from
 * @param {string} destPath - The destination path to save the file
 * @returns {Promise<void>} A promise that resolves when the download is complete
 */
async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode >= 400) {
                reject(new Error(`${response.statusCode} returned from ${url}`));
                return;
            }
            pipelineAsync(response, file)
                .then(() => resolve())
                .catch(reject);
        }).on('error', reject);
    });
}

/**
 * Gets the directory name of the current script (ESM equivalent of __dirname)
 * @returns {string} The directory path of the current script
 */
function getScriptDir() {
    const filename = fileURLToPath(import.meta.url);
    return path.dirname(filename);
}

/**
 * Extracts a tar.gz file to a destination directory
 * @param {string} tarGzPath - Path to the tar.gz file
 * @param {string} destDir - Destination directory for extraction
 * @returns {Promise<void>} A promise that resolves when extraction is complete
 */
async function extractTarGz(tarGzPath, destDir) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(tarGzPath)
            .pipe(zlib.createGunzip())
            .pipe(tar.extract({ cwd: destDir, strip: 0 }))
            .on('end', resolve)
            .on('error', reject);
    });
}

/**
 * Extracts a zip file to a destination directory
 * @param {string} zipPath - Path to the zip file
 * @param {string} destDir - Destination directory for extraction
 * @returns {Promise<void>} A promise that resolves when extraction is complete
 */
async function extractZip(zipPath, destDir) {
    const directory = await unzip.Open.file(zipPath);
    return directory.extract({ path: destDir });
}

/**
 * Creates a path relative to the project root (parent of scripts directory)
 * @param {...string} pathSegments - Path segments to join
 * @returns {string} The constructed path
 */
function getProjectPath(...pathSegments) {
    const scriptDir = getScriptDir();
    const projectRoot = path.join(scriptDir, '..');
    return path.join(projectRoot, ...pathSegments);
}

/**
 * Handles errors with consistent logging and exit behavior
 * @param {Error} error - The error to handle
 * @param {string} context - Context description for the error
 * @param {boolean} shouldExit - Whether to exit the process (default: true)
 */
function handleError(error, context, shouldExit = true) {
    console.error(`Error ${context}:`, error.message);
    if (shouldExit) {
        process.exit(1);
    }
}

/**
 * Sets up the main execution pattern for scripts
 * @param {Function} mainFunction - The main function to execute
 */
function setupMainExecution(mainFunction) {
    if (import.meta.url === `file://${process.argv[1]}`) {
        mainFunction().catch(console.error);
    }
}

export {
    downloadFile, extractTarGz, extractZip,
    getProjectPath, getScriptDir, handleError,
    setupMainExecution
};
