import { Writable } from 'stream';
import { Terminal, window, workspace } from 'vscode';
import { apiHandler } from './apiHandler';
import { BazelTerminal } from './bazelTerminal';
import { LOGGER, getWorkspaceRoot } from './util';

const BAZEL_TERMINAL_NAME = 'Bazel Build Status';
const workspaceRoot = getWorkspaceRoot();
const SYNC_INFO = RegExp(/100.0%\s+Synchronizing\s+core\s+(\S+)\n/);

export namespace BazelLanguageServerTerminal {
	export function stream(): Writable {
		const s = new Writable();
		s._write = (chunk: Buffer, encoding, next) => {
			getBazelTerminal().sendText(chunk.toString());
			catchBazelLog(chunk.toString());
			next();
		};
		s.on('unpipe', () => s.end());

		return s;
	}

	// good reference if you want to change any colors https://misc.flogisoft.com/bash/tip_colors_and_formatting
	export function info(msg: string) {
		getBazelTerminal().sendText(`\u001b[32m${msg}\u001b[0m`);
	} // green
	export function warn(msg: string) {
		if (getLogLevel() >= LogLevel.WARN) {
			getBazelTerminal().sendText(`\u001b[33m${msg}\u001b[0m`);
		}
	} // yellow
	export function debug(msg: string) {
		if (getLogLevel() >= LogLevel.WARN) {
			getBazelTerminal().sendText(`\u001b[34m${msg}\u001b[0m`);
		}
	} // blue
	export function error(msg: string) {
		getBazelTerminal().sendText(`\u001b[31m${msg}\u001b[0m`);
	} // red
	export function trace(msg: string) {
		if (getLogLevel() >= LogLevel.WARN) {
			getBazelTerminal().sendText(`\u001b[37m${msg}\u001b[0m`);
		}
	} // gray
}

// Catch some bazel log messages to trigger API events
export function getBazelTerminal(): Terminal {
	const term = window.terminals.find(
		(term) => term.name === BAZEL_TERMINAL_NAME
	);
	if (!term) {
		return window.createTerminal({
			name: BAZEL_TERMINAL_NAME,
			pty: new BazelTerminal(),
		});
	}
	return term;
}

enum LogLevel {
	INFO,
	ERROR = 0,
	WARN = 1,
	DEBUG = 2,
	TRACE = 3,
}

function getLogLevel(): LogLevel {
	const levelVal = workspace.getConfiguration('java.bazel').get('log.level');

	switch (levelVal) {
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

function catchBazelLog(chunk: string) {
	const syncInfo = SYNC_INFO.exec(chunk);
	if (syncInfo) {
		let timeTook = 0;
		if (syncInfo[1]) {
			if (/[0-9]+s/.test(syncInfo[1])) {
				timeTook = parseInt(syncInfo[1].replace('s', ''));
			}
		}
		LOGGER.info(`Synchronization Summary detected. TimeTook ${timeTook}`);
		apiHandler.fireSyncEnded(workspaceRoot, timeTook);
	}
}
