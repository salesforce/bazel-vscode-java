import { AddressInfo, Server, Socket, createServer } from 'net';
// import { setTimeout } from 'timers/promises';
import { commands } from 'vscode';
import { Commands } from './commands';
import { Log } from './log';

const SERVER_START_RETRIES = 10;
const PORT_REGISTRATION_RETRIES = 10;
const RETRY_INTERVAL = 5000; // ms

let server: Server|undefined;

function startTCPServer(attempts=0): Promise<number>{
	return new Promise(resolve => {
		if(!server){
			server = createServer((sock: Socket) => {
				Log.trace('socket connected');
				console.log('socket connected');
				attempts = 0;

				sock.pipe(Log.stream());

				sock.on('end', () => {
					sock.unpipe(Log.stream());
				});
			});
		}
		server.listen(0, 'localhost', () => {
			if(server){
				const address = server.address();
				if(address){
					const port = (address as AddressInfo).port;
					Log.debug(`Bazel log server listening on port ${port}`);
					console.log(`Bazel log server listening on port ${port}`);
					resolve(port);
				}
			} else {
				Log.error(`Failed to start bazel TCP server`);
				console.error(`Failed to start bazel TCP server`);
				setTimeout(() => startTCPServer(attempts+1), 1000*attempts);
			}
		});

		server.on('error', (err: Error) => {
			console.error(err.message);
			Log.error(err.message);
		});
	});
}

export function registerLSClient(): Promise<void> {
	return startTCPServer()
		.then(port => registerPortWithLanguageServer(port))
		.catch(err => Log.error(`Failed to register port with BLS: ${err.message}`));
}

export function connections(): number {
	return server ? server.connections : 0;
}

function registerPortWithLanguageServer(port: number, attempts=0, maxRetries=50){
	console.log(`register port attempt ${attempts}`);
	commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.REGISTER_BAZEL_TCP_SERVER_PORT, port)
		.then(() => {
			Log.info(`port ${port} registered with BLS`); //TODO: change to trace
			console.log(`port ${port} registered with BLS`);
		}, (err: Error) => {
			if(attempts >= maxRetries){
				throw err;
			}
			console.error(`register port failed ${attempts} : ${err.message}`);
			setTimeout(() => registerPortWithLanguageServer(port, attempts+1), 1000*attempts);
		});
}
