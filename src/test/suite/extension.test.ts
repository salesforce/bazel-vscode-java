import * as assert from 'assert';
import { env } from 'process';
import * as vscode from 'vscode';
import { Commands } from '../../commands';
import { Jdtls } from './Jdtls';
import { JavaExtensionAPI, ServerMode } from './jdtls.extension.api';


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
			await new Promise(resolve => {
				setTimeout(resolve, 5000);
			});
			if (ext!.isActive) {
				break;
			}
		}
	});

	test('Bazel Java Extension should activate', async function () {
		this.timeout(60000 * 2);
		const ext = vscode.extensions.getExtension('sfdc.bazel-vscode-java');
		while (true) {
			await new Promise(resolve => {
				setTimeout(resolve, 5000);
			});
			if (ext!.isActive) {
				break;
			}
		}
	});

	test('should register all java.bazel commands', () => {
		if (env['SKIP_COMMANDS_TEST'] === 'true') {
			console.log('Skipping "should register all java commands"');
			return;
		}

		return vscode.commands.getCommands(true).then((commands) =>
		{
			const JAVA_COMMANDS = [
				Commands.SYNC_PROJECTS_CMD,
				Commands.UPDATE_CLASSPATHS_CMD,
			].sort();
			const foundBazelJavaCommands = commands.filter((value) => {
				return JAVA_COMMANDS.indexOf(value)>=0 || value.startsWith('java.bazel.');
			}).sort();
			assert.deepStrictEqual(foundBazelJavaCommands, JAVA_COMMANDS, `Some Bazel Java commands are not registered properly or a new command is not added to the test.\nActual: ${foundBazelJavaCommands}\nExpected: ${JAVA_COMMANDS}`);
		});
	});

	test('should have working JDTLS', function () {
		return vscode.extensions.getExtension('redhat.java')!.activate().then((api: JavaExtensionAPI) => {
			assert.ok(!!api);
			assert.strictEqual(api.serverMode, ServerMode.hybrid);
		});
	});

	test('should build workspace without problems', async function () {
		this.timeout(60000 * 2);
		return Jdtls.buildWorkspace().then((result) => {
			assert.strictEqual(result, Jdtls.CompileWorkspaceStatus.Succeed);

			return Jdtls.getSourcePaths().then(resp => {
				const projects = new Set(resp.data.map(p => p.projectName));
				assert.ok(projects.size > 0);
			});
		});
	});

});