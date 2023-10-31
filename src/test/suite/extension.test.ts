import * as assert from 'assert';
import { setTimeout } from 'node:timers/promises';
import { env } from 'process';
import * as vscode from 'vscode';
import { Commands } from '../../commands';


suite('Java Language Extension - Standard', () => {

	test('RedHat Java Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('redhat.java'));
	});

	test('Bazel Java Extension should be present', () => {
		assert.ok(vscode.extensions.getExtension('sfdc.bazel-vscode-java'));
	});

	test('RedHat Java Extension should activate', async function () {
		this.timeout(60000 * 2);
		const ext = vscode.extensions.getExtension('redhat.java');
		while (true) {
			await setTimeout(5000);
			if (ext!.isActive) {
				break;
			}
		}
	});

	test('Bazel Java Extension should activate', async function () {
		this.timeout(60000 * 2);
		const ext = vscode.extensions.getExtension('sfdc.bazel-vscode-java');
		while (true) {
			await setTimeout(5000);
			if (ext!.isActive) {
				break;
			}
		}
	});

	test('should register all java.bazel commands', async function() {
		this.timeout(60000 * 2);
		if (env['SKIP_COMMANDS_TEST'] === 'true') {
			console.log('Skipping "should register all java commands"');
			return;
		}

		let api = vscode.extensions.getExtension('bazel-vscode-java')?.exports;
		if(!api) {
			api = await vscode.extensions.getExtension('bazel-vscode-java')?.activate();
		}

		await setTimeout(50000);
		let commands = await vscode.commands.getCommands(true);
		const JAVA_COMMANDS = [
			Commands.SYNC_PROJECTS_CMD,
			Commands.UPDATE_CLASSPATHS_CMD,
			Commands.SYNC_PROJECTS,
			Commands.UPDATE_CLASSPATHS,
			Commands.REGISTER_BAZEL_TCP_SERVER_PORT,
			Commands.DEBUG_LS_CMD,
			Commands.OPEN_BAZEL_BUILD_STATUS_CMD
		].sort();

		const foundBazelJavaCommands = commands.filter((value) => {
			return JAVA_COMMANDS.indexOf(value)>=0 || value.startsWith('java.bazel.');
		}).sort();

		assert.deepStrictEqual(
			foundBazelJavaCommands,
			JAVA_COMMANDS,
			`Some Bazel Java commands are not registered properly or a new command
			is not added to the test.\nActual: ${foundBazelJavaCommands}\nExpected: ${JAVA_COMMANDS}`);
	});

	test('should have working JDTLS', async function () {
		let api = vscode.extensions.getExtension('redhat.java')?.exports;
		if(!api) {
			api = await vscode.extensions.getExtension('redhat.java')!.activate();
		}
		assert.ok(!!api);
		assert.strictEqual(api.status, 'Started');
	});

	// this is currently broken for the `small` test project.
	// test('should build workspace without problems within reasonable time', function () {
	// 	this.timeout(60000 * 5);
	// 	return Jdtls.buildWorkspace().then((result) => {
	// 		assert.strictEqual(result, Jdtls.CompileWorkspaceStatus.Succeed);

	// 		return Jdtls.getSourcePaths().then(resp => {
	// 			const projects = new Set(resp.data.map(p => p.projectName));
	// 			assert.ok(projects.size > 0);
	// 		});
	// 	});
	// });

});