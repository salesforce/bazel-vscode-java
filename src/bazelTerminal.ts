import { exec as cpExec } from "child_process";
import { promisify } from "util";
import { Event, EventEmitter, Pseudoterminal, TerminalDimensions } from 'vscode';

const exec = promisify(cpExec);

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
		const {stdout, stderr} = await exec(`printf '${data.replace(/\r+/g, '\r\n')}'`);
		if(stdout){
			this.writeEmitter.fire(stdout);
		}
		if(stderr) {
			this.writeEmitter.fire(stderr);
		}
	}
}