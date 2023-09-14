import { AddressInfo, Server, Socket, createServer } from 'net';
import { commands } from 'vscode';
import { Commands } from './commands';
import { Log } from './log';

let server: Server|undefined;

export function registerLSClient(attempts=0) {

	// create tcp server
	server = createServer((sock: Socket) => {
		sock.on('connect', () => {
			Log.info('Connected');
			attempts = 0;
		});
		sock.pipe(Log.stream);
	});

	server.listen(0, 'localhost', () => {
		if(server){
			const address = server.address();
			if(address){
				const port = (address as AddressInfo).port;
				Log.info(`Bazel server listening on port ${port}`);
				commands.executeCommand(Commands.EXECUTE_WORKSPACE_COMMAND, Commands.REGISTER_BAZEL_TCP_SERVER_PORT, port)
					.then(() => Log.info('port registered with BLS'), (err: Error) => Log.error(`Failed to register port with BLS: ${err.message}`));
			}

		} else {
			Log.error(`Failed to start bazel TCP server`);
			attempts++;
			setTimeout(() => registerLSClient(), 1000*attempts);
		}

	});
}
