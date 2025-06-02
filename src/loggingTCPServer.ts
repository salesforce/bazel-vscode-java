import { AddressInfo, Server, Socket, createServer } from 'net';
import { setTimeout } from 'timers/promises';
import { commands, workspace } from 'vscode';
import { Commands } from './commands';
import { BazelServerTerminal } from './extension.api';

const SERVER_START_RETRIES = 10;
const PORT_REGISTRATION_RETRIES = 10;
const RETRY_INTERVAL = 5000; // ms

let server: Server | undefined;

function startTCPServer(
	bazelTerminal: BazelServerTerminal,
	attempts = 0
): Promise<number> {
	let port = 0;
	if (workspace.getConfiguration('java').has('jdt.ls.vmargs')) {
		const vmargs = workspace
			.getConfiguration('java')
			.get<string>('jdt.ls.vmargs');
		if (vmargs?.includes('java.bazel.staticProcessStreamSocket')) {
			port = parseInt(
				vmargs
					.split(/\s+/)
					.filter((x) => x.includes('java.bazel.staticProcessStreamSocket'))[0]
					.split('=')[1]
			);
		}
	}

	return new Promise((resolve) => {
		if (!server) {
			server = createServer((sock: Socket) => {
				attempts = 0;

				sock.pipe(bazelTerminal.stream());

				sock.on('end', () => {
					sock.unpipe(bazelTerminal.stream());
				});
				sock.on('error', (err: Error) => {
					bazelTerminal.error(err.message);
					sock.end();
				});
			});
		}
		server.listen(port, 'localhost', () => {
			if (server) {
				const address = server.address();
				if (address) {
					const port = (address as AddressInfo).port;
					bazelTerminal.debug(`Bazel log server listening on port ${port}`);
					resolve(port);
				}
			} else {
				bazelTerminal.error(`Failed to start bazel TCP server`);
				setTimeout<number>(1000 * attempts).then(() =>
					startTCPServer(bazelTerminal, attempts + 1)
				);
			}
		});

		server.on('error', (err: Error) => {
			console.error(err.message);
			bazelTerminal.error(err.message);
		});
	});
}

export function registerLSClient(
	bazelTerminal: BazelServerTerminal
): Promise<void> {
	bazelTerminal.info('java LS registering');
	return startTCPServer(bazelTerminal)
		.then((port) => registerPortWithLanguageServer(port, bazelTerminal))
		.catch((err) =>
			bazelTerminal.error(`Failed to register port with BLS: ${err.message}`)
		);
}

async function registerPortWithLanguageServer(
	port: number,
	bazelTerminal: BazelServerTerminal,
	attempts = 0,
	maxRetries = 50
): Promise<void> {
	let error = null;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await commands
				.executeCommand(
					Commands.EXECUTE_WORKSPACE_COMMAND,
					Commands.REGISTER_BAZEL_TCP_SERVER_PORT,
					port
				)
				.then(() => bazelTerminal.trace(`port ${port} registered with BLS`));
		} catch (err) {
			error = err;
			console.error(`register port failed ${attempts} : ${err}`);
			await setTimeout(i * 1000);
		}
	}
	return Promise.reject(error);
}
