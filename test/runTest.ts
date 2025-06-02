import * as cp from 'child_process';
import * as fs from 'fs';
import { glob } from 'glob';
import * as os from 'os';
import * as path from 'path';
import { env } from 'process';

import {
	downloadAndUnzipVSCode,
	resolveCliArgsFromVSCodeExecutablePath,
	runTests,
} from '@vscode/test-electron';

async function main() {
	// folder containing the Extension Manifest package.json
	const extensionDevelopmentPath = path.resolve(__dirname, '../../');

	// path to the extension test runner script
	const extensionTestsPath = path.resolve(__dirname, './suite/index');

	// path to the sampel project for testing
	const testProjectPath: string = path.resolve(
		extensionDevelopmentPath,
		'./test/projects/small/'
	);

	// temp area for test user data
	const testUserDataPath: string = path.resolve(
		os.tmpdir(),
		'./suite-projects-small/'
	);

	try {
		// prepare VS Code (use latest stable)
		const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');
		const [cliPath, ...args] =
			resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

		// span vs code process for custom setup
		cp.spawnSync(
			cliPath,
			[...args, '--install-extension', 'redhat.java', 'sfdc-eng.bazel-vscode'],
			{
				encoding: 'utf-8',
				stdio: 'inherit',
			}
		);

		// ensrue the user data area is empty
		if (fs.existsSync(testUserDataPath)) {
			fs.rmdirSync(testUserDataPath, { recursive: true });
		}

		// run the integration test with spawned VS Code
		console.log(
			`Running test suite with\n\tproject: ${testProjectPath}\n\tuser-data-dir: ${testUserDataPath}\n...`
		);
		await runTests({
			vscodeExecutablePath,
			extensionDevelopmentPath,
			extensionTestsPath,
			launchArgs: [
				'--disable-workspace-trust',
				'--user-data-dir',
				testUserDataPath,
				testProjectPath,
			],
		});
	} catch (err) {
		console.log('\n\n\n');
		console.log(
			'********************************************************************************************'
		);
		console.error(`Failed to run tests: ${err}`);
		console.log(
			'********************************************************************************************'
		);
		console.log('\n\n\n');

		// try to locate Java LS log
		const lsLogs = await glob(
			['**/*Java.log', '**/redhat.java/jdt_ws/.metadata/.log'],
			{ cwd: testUserDataPath, withFileTypes: true, dot: true }
		);
		if (lsLogs.length > 0) {
			if (env['PRINT_JDTLS_LOGS'] === 'true') {
				lsLogs.forEach((log) => {
					console.log(`> cat ${log.fullpath()}`);
					try {
						const data = fs.readFileSync(log.fullpath(), 'utf8');
						console.log(data);
					} catch (err) {
						console.error(err);
					}
					console.log('\n\n\n');
				});
			} else {
				console.log(
					'Set PRINT_JDTLS_LOGS=true to show the following JDTLS log automatically:'
				);
				lsLogs.forEach((log) => {
					console.log(`\tcat ${log.fullpath()}`);
				});
			}
		} else {
			console.warn('No logs from JDTLS found!');
		}

		process.exit(1);
	}
}

main();
