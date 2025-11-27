#!/usr/bin/env node

// forked from https://github.com/redhat-developer/vscode-java/blob/c7014730bcb07ee664eea2af34747613736a81ec/scripts/index.mjs

import { pathToFileURL } from 'url';
import { preparePreRelease } from './release.mjs';
import { repoCheck, repoFix } from './repo.mjs';
import { buildOrDownload, buildServer, downloadServer } from './server.mjs';

async function main() {
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
        // Server commands
        case 'download-server':
            await downloadServer();
            break;
        case 'build-server':
            try {
                await buildServer();
            } catch (error) {
                console.error('Build failed:', error.message);
                process.exit(1);
            }
            break;
        case 'build-or-download':
            await buildOrDownload();
            break;

        // Release commands
        case 'prepare-pre-release':
            await preparePreRelease();
            break;

        // Repository commands
        case 'repo-check':
            await repoCheck();
            break;
        case 'repo-fix':
            await repoFix();
            break;

        default:
            console.log(`
Usage: node scripts/index.js <command> [options]

Commands:
  Server Management:
    download-server                     Download Bazel JDT Language Server extension
    build-server                        Build Bazel JDT Language Server extension
    build-or-download                   Build or download Bazel JDT Language Server extension

  Release Management:
    prepare-pre-release                 Prepare pre-release version

  Repository Management:
    repo-check                          Check package-lock.json for internal registry references
    repo-fix                            Fix package-lock.json registry references

Examples:
  node scripts/index.js build-or-download
  node scripts/index.js watch-server
            `);
            process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).toString()) {
    main().catch(console.error);
}

export {
    buildOrDownload, buildServer, downloadServer, preparePreRelease, repoCheck, repoFix
};

