import { AddressInfo, Server, Socket, createServer } from 'net';
import { setTimeout } from 'timers/promises';
import { commands, workspace } from 'vscode';
import { BazelLanguageServerTerminal } from './bazelLangaugeServerTerminal';
import { Commands } from './commands';
import { LOGGER } from './util';

const SERVER_START_RETRIES = 10;
const PORT_REGISTRATION_RETRIES = 10;
const RETRY_INTERVAL = 5000; // ms

let server: Server | undefined;

function startTCPServer(attempts = 0): Promise<number> {
	let port = 0;
	if (workspace.getConfiguration('java').has('jdt.ls.vmargs')) {
		LOGGER.info('Adjusting vmargs for TCP Server.');
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
			LOGGER.info('Starting TCP Server.');
			server = createServer((sock: Socket) => {
				attempts = 0;

				sock.pipe(BazelLanguageServerTerminal.stream());

				sock.on('end', () => {
					sock.unpipe(BazelLanguageServerTerminal.stream());
				});
				sock.on('error', (err: Error) => {
					BazelLanguageServerTerminal.error(err.message);
					sock.end();
				});
			});
		}
		server.listen(port, 'localhost', () => {
			if (server) {
				const address = server.address();
				if (address) {
					const port = (address as AddressInfo).port;
					BazelLanguageServerTerminal.debug(
						`Bazel log server listening on port ${port}`
					);
					LOGGER.info(`Bazel log server listening on port ${port}`);
					resolve(port);
				}
			} else {
				LOGGER.info('Failed to start bazel TCP server');
				BazelLanguageServerTerminal.error('Failed to start bazel TCP server');
				setTimeout<number>(1000 * attempts).then(() =>
					startTCPServer(attempts + 1)
				);
			}
		});

		server.on('error', (err: Error) => {
			console.error(err.message);
			BazelLanguageServerTerminal.error(err.message);
		});
	});
}

export function registerLSClient(): Promise<void> {
	return startTCPServer()
		.then((port) => registerPortWithLanguageServer(port))
		.catch((err) =>
			BazelLanguageServerTerminal.error(
				`Failed to register port with BLS: ${err.message}`
			)
		);
}

async function registerPortWithLanguageServer(
	port: number,
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
				.then(() =>
					BazelLanguageServerTerminal.trace(`port ${port} registered with BLS`)
				);
		} catch (err) {
			error = err;
			console.error(`register port failed ${attempts} : ${err}`);
			await setTimeout(i * 1000);
		}
	}
	return Promise.reject(error);
}
