import { Writable } from 'stream';
import { Terminal, window, workspace } from 'vscode';
import { apiHandler } from './apiHandler';
import { BazelTerminal } from './bazelTerminal';
import { TerminalLogPattern } from './extension.api';
import { LOGGER, getWorkspaceRoot } from './util';

const BAZEL_TERMINAL_NAME = 'Bazel Build Status';
const workspaceRoot = getWorkspaceRoot();

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
	// apiHandler.bazelTerminalLogListeners['BazelTest']={ name: 'BazelTest', pattern: RegExp(/100.0%\s+Synchronizing\s+core\s+(\S+)\n/), sendFullMessage: true}
	apiHandler.bazelTerminalLogListeners.forEach(
		(logPattern: TerminalLogPattern, name: string) => {
			const patternToMatch = logPattern.pattern;
			const patternMatched = patternToMatch.exec(chunk);
			if (patternMatched) {
				LOGGER.debug(`catchBazelLog ${name}`);
				let textPiece = patternMatched[0];
				if (logPattern.sendFullMessage) {
					textPiece = chunk;
				}
				apiHandler.fireBazelTerminalLog({
					name: name,
					pattern: patternToMatch,
					fullMessage: textPiece,
					workspaceRoot: workspaceRoot,
				});
			}
		}
	);
}
