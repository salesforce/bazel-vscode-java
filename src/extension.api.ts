import { Writable } from 'stream';
import { BazelProjectView } from './types';

export interface BazelJavaExtensionAPI {
	readonly sync: Function;
}

export interface BazelVscodeExtensionAPI {
	readonly parseProjectFile: BazelProjectView;
	readonly bazelTerminal: BazelServerTerminal;
}

export interface BazelServerTerminal {
	stream(): Writable;
	info(msg: string): void;
	warn(msg: string): void;
	debug(msg: string): void;
	error(msg: string): void;
	trace(msg: string): void;
}
