import * as net from 'net';
import { CustomExecution, Event, EventEmitter, Pseudoterminal, Task, TaskScope, TerminalDimensions } from 'vscode';

export function startServer(connectionListener: (socket: net.Socket) => void): Thenable<net.Server> {
	return new Promise((res, rej) => {
		const server = net.createServer(socket => {
			const writeEmitter = new EventEmitter<string>();
			const pty: Pseudoterminal = {
			  onDidWrite: writeEmitter.event,
				open: () => {},
			   close: () => {}
			 };


			const presenterTask = new Task({ type: "Bazel" }, TaskScope.Workspace, "Bazel Execution", "bazel", new CustomExecution(async () => {
				return pty;
			}));

			socket.on('data', function (data) {
				// VS Code Pseudoterminal needs \r to reset line
				// UTF-8 is expected
				let output = data.toString().replace(/\r?\n/g, '\r\n');
			});

		});
		server.on('error', rej);
		server.listen(0, () => {
			//server.removeListener('error', rej);
			res(server);
		});
		return server;
	});
}

class BazelTask implements Pseudoterminal {
	private onDidWriteEvent = new EventEmitter<string>();
	private onDidCloseEvent = new EventEmitter<number | void>();
	private onDidChangeNameEvent = new EventEmitter<string>();

	onDidWrite: Event<string> = this.onDidWriteEvent.event;
	onDidClose?: Event<number | void> = this.onDidCloseEvent.event;;
	onDidChangeName?: Event<string> = this.onDidChangeNameEvent.event;

	open(initialDimensions: TerminalDimensions | undefined): void {
		throw new Error('Method not implemented.');
	}
	close(): void {
		throw new Error('Method not implemented.');
	}
	handleInput?(data: string): void {
		throw new Error('Method not implemented.');
	}
	setDimensions?(dimensions: TerminalDimensions): void {
		throw new Error('Method not implemented.');
	}

}