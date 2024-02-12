import { Uri } from 'vscode';
import { Emitter } from 'vscode-languageclient';
import { MyExtensionAPI } from './extension.api';

class ApiHandler {
    private api!: MyExtensionAPI;
    private onSyncStartedEmitter: Emitter<string> = new Emitter<string>();
    private onBazelProjectFileCreatedEmitter: Emitter<string> = new Emitter<string>();
    private onBazelProjectFileUpdatedEmitter: Emitter<Uri> = new Emitter<Uri>();
    private onSyncDirectoriesStartedEmitter: Emitter<string[]> = new Emitter<string[]>();
    private onSyncDirectoriesEndedEmitter: Emitter<string[]> = new Emitter<string[]>;

    public initApi(){
        const onSyncStarted = this.onSyncStartedEmitter.event;
        const onBazelProjectFileCreated = this.onBazelProjectFileCreatedEmitter.event;
        const onBazelProjectFileUpdated = this.onBazelProjectFileUpdatedEmitter.event;
        const onSyncDirectoriesStarted = this.onSyncDirectoriesStartedEmitter.event;
        const onSyncDirectoriesEnded = this.onSyncDirectoriesEndedEmitter.event;

        this.api = {
            onSyncStarted,
            onBazelProjectFileCreated,
            onBazelProjectFileUpdated,
            onSyncDirectoriesStarted,
            onSyncDirectoriesEnded
        };
    }

    public fireSyncStarted(event: string){
        this.onSyncStartedEmitter.fire(event);
    }

    public fireBazelProjectFileCreated(event: string){
        this.onBazelProjectFileCreatedEmitter.fire(event);
    }

    public fireBazelProjectFileUpdated(event: Uri){
        this.onBazelProjectFileUpdatedEmitter.fire(event);
    }

    public fireSyncDirectoriesStarted(event: string[]){
        this.onSyncDirectoriesStartedEmitter.fire(event);
    }

    public fireSyncDirectoriesEnded(event: string[]){
        this.onSyncDirectoriesEndedEmitter.fire(event);
    }

    public getApi(): MyExtensionAPI{
        if (!this.api) throw new Error(`ApiHandler is not initialized`);
        return this.api;
    }
}

export const apiHandler = new ApiHandler();
