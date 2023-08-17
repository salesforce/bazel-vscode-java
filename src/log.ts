import { Writable } from 'stream';
import { window } from 'vscode';

const bazelOutputChannel = window.createOutputChannel('Bazel', {log: true});

export namespace Log {
	export function info(msg: string|Buffer) {write(msg, LogLevel.INFO);}
	export function warn(msg: string|Buffer) {write(msg, LogLevel.WARN);}
	export function error(msg: string|Buffer) {write(msg, LogLevel.ERROR);}
	export function debug(msg: string|Buffer) {write(msg, LogLevel.DEBUG);}
	export function trace(msg: string|Buffer) {write(msg, LogLevel.TRACE);}

	export const stream = new Writable();
	stream._write = (chunk: Buffer, _encoding, next) => {
		bazelOutputChannel.append(chunk.toString());
		next();
	};

	function write(msg: string|Buffer, level: LogLevel){
		bazelOutputChannel.show();
		if(msg instanceof Buffer){
			msg = msg.toString();
		}
		switch(level){
			case LogLevel.INFO:
				bazelOutputChannel.info(msg);
				break;
			case LogLevel.WARN:
				bazelOutputChannel.warn(msg);
				break;
			case LogLevel.ERROR:
				bazelOutputChannel.error(msg);
				break;
			case LogLevel.DEBUG:
				bazelOutputChannel.debug(msg);
				break;
			case LogLevel.TRACE:
				bazelOutputChannel.trace(msg);
				break;
			default:
				bazelOutputChannel.appendLine(msg);
		}
	}

}

enum LogLevel {
	INFO, WARN, ERROR, DEBUG, TRACE,
}
