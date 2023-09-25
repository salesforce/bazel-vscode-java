import { Writable } from 'stream';
import { Terminal, window, workspace } from 'vscode';
import { BazelTerminal } from './bazelTerminal';

const BAZEL_TERMINAL_NAME = 'Bazel Build Status';

export namespace Log {

	export function stream(): Writable {
		const s = new Writable();
		s._write = (chunk: Buffer, encoding, next) => {
			getBazelTerminal().sendText(chunk.toString());
			next();
		};
		s.on('unpipe', () => s.end());

		return s;
	}

	// good reference if you want to change any colors https://misc.flogisoft.com/bash/tip_colors_and_formatting
	export function info(msg: string){ getBazelTerminal().sendText(`\\e[32m${msg}\\e[0m`); } // green
	export function warn(msg: string){ if(getLogLevel() >= LogLevel.WARN) {getBazelTerminal().sendText(`\\e[33m${msg}\\e[0m`);} } // yellow
	export function debug(msg: string){ if(getLogLevel() >= LogLevel.WARN) {getBazelTerminal().sendText(`\\e[34m${msg}\\e[0m`);} } // blue
	export function error(msg: string){ getBazelTerminal().sendText(`\\e[31m${msg}\\e[0m`); } // red
	export function trace(msg: string){ if(getLogLevel() >= LogLevel.WARN) {getBazelTerminal().sendText(`\\e[37m${msg}\\e[0m`);} } // gray

}

function getBazelTerminal(): Terminal {
	let term = window.terminals.find((term) => term.name === BAZEL_TERMINAL_NAME);
	if(!term){
		return window.createTerminal({
			name: BAZEL_TERMINAL_NAME,
			pty: new BazelTerminal
		});
	}
	return term;
}

enum LogLevel {
	INFO, ERROR = 0,
	WARN = 1,
	DEBUG = 2,
	TRACE = 3
}

function getLogLevel(): LogLevel {
	const levelVal = workspace.getConfiguration('java.bazel').get('log.level');

	switch(levelVal) {
		case 'debug':
			return LogLevel.DEBUG;
		case 'warn':
			return LogLevel.WARN;
		case 'trace':
			return LogLevel.TRACE;
		default:
			return LogLevel.INFO;
	}
}
