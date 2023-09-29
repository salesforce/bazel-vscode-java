import { exec } from "child_process";
import { Event, EventEmitter, Pseudoterminal, TerminalDimensions } from 'vscode';

export class BazelTerminal implements Pseudoterminal {

	private writeEmitter = new EventEmitter<string>();

	onDidWrite = this.writeEmitter.event;
	onDidOverrideDimensions?: Event<TerminalDimensions | undefined> | undefined;
	onDidClose?: Event<number | void> | undefined;
	onDidChangeName?: Event<string> | undefined;

	open(initialDimensions: TerminalDimensions | undefined): void {
		this.writeEmitter.fire('');
	}
	close(): void {
		this.writeEmitter.dispose();
	}
	async handleInput?(data: string): Promise<void> {
		exec(`printf "${data
			.replace(/\"/g, '\\"')
			.replace(/\`/g, '\\`')
			.replace(/\r+/g, '\r\n')}"`, (err, stdout, stderr) => {
			if(stdout){
				this.writeEmitter.fire(stdout);
			}
			if(stderr) {
				this.writeEmitter.fire(stderr);
			}
			if(err) {
				console.log(`failed to execute: ${err.cmd}`);
				this.writeEmitter.fire(err.message);
			}
		});
	}
}