import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';

async function main() {
	try {
		// folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, '../../');

		// path to the extension test runner script
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

		// path to the sampel project for testing
		const testProjectPath: string = path.resolve(extensionDevelopmentPath, './src/test/projects/small/');

		// prepare VS Code (use latest stable)
		const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
		const [cliPath, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

		// span vs code process for custom setup
		cp.spawnSync(
			cliPath,
			[...args, '--install-extension', 'redhat.java'],
			{
				encoding: 'utf-8',
				stdio: 'inherit'
			}
		);

		// run the integration test with spawned VS Code
		console.log(`Running test suite with project ${testProjectPath} ...`);
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--disable-workspace-trust',
				'--user-data-dir',
				`${os.tmpdir()}`,
				testProjectPath
			]
		});
	} catch (err) {
		console.error('Failed to run tests');
		console.error(err);
		process.exit(1);
	}
}

main();