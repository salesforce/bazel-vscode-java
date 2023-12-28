import {
	Event,
	EventEmitter,
	Pseudoterminal,
	TerminalDimensions,
} from 'vscode';

let backtickHighlight = true;

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
		this.writeEmitter.fire(
			data
				.replace(/\"/g, '\\"')
				.replace(/\`/g, highlightBacktick)
				.replace(/(\r|\n)+/g, '\r\n')
		);
	}
}

function highlightBacktick(substring: string, ...args: any[]): string {
	backtickHighlight = !backtickHighlight;
	if (backtickHighlight) {
		return '\u001b[0m';
	}
	return '\u001b[33m';
}
