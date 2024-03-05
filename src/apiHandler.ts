import { Emitter } from 'vscode-languageclient';
import {
	BazelEventsExtensionAPI,
	TerminalLogEvent,
	TerminalLogPattern,
} from './extension.api';
import { LOGGER } from './util';

class ApiHandler {
	private api!: BazelEventsExtensionAPI;
	private onSyncStartedEmitter: Emitter<string> = new Emitter<string>();
	private onBazelTerminalLogEmitter: Emitter<TerminalLogEvent> =
		new Emitter<TerminalLogEvent>();
	private onSyncDirectoriesStartedEmitter: Emitter<string[]> = new Emitter<
		string[]
	>();
	private onSyncDirectoriesEndedEmitter: Emitter<string[]> = new Emitter<
		string[]
	>();

	public bazelTerminalLogListeners: Map<string, TerminalLogPattern> = new Map();

	public initApi() {
		const onSyncStarted = this.onSyncStartedEmitter.event;
		const onBazelTerminalLog = this.onBazelTerminalLogEmitter.event;
		const onSyncDirectoriesStarted = this.onSyncDirectoriesStartedEmitter.event;
		const onSyncDirectoriesEnded = this.onSyncDirectoriesEndedEmitter.event;
		const appendBazelTerminalLogPattern = this.appendBazelTerminalLogPattern;

		this.api = {
			onSyncStarted,
			onBazelTerminalLog,
			onSyncDirectoriesStarted,
			onSyncDirectoriesEnded,
			appendBazelTerminalLogPattern,
		};
	}

	private appendBazelTerminalLogPattern(pattern: TerminalLogPattern): boolean {
		LOGGER.debug(
			`appendBazelTerminalLogPattern ${pattern.name} RegExp:${pattern.pattern}`
		);
		this.bazelTerminalLogListeners.set(pattern.name, pattern);
		return true;
	}

	public fireSyncStarted(event: string) {
		this.onSyncStartedEmitter.fire(event);
	}

	public fireBazelTerminalLog(event: TerminalLogEvent) {
		this.onBazelTerminalLogEmitter.fire(event);
	}

	public fireSyncDirectoriesStarted(event: string[]) {
		this.onSyncDirectoriesStartedEmitter.fire(event);
	}

	public fireSyncDirectoriesEnded(event: string[]) {
		this.onSyncDirectoriesEndedEmitter.fire(event);
	}

	public getApi(): BazelEventsExtensionAPI {
		if (!this.api) {
			throw new Error(`ApiHandler is not initialized`);
		}
		return this.api;
	}
}

export const apiHandler = new ApiHandler();
