import * as bazelmodule from './bazelmodule';

export class VsCodeWorkspace {
    private readonly filesExclude: string = 'files.exclude';
    private readonly currentFolder: string = '.';

    folders: VsCodePath[];
    settings: any;
    constructor(modules: bazelmodule.BazelModule[]) {
        this.folders = [];
        this.folders.push({ path: this.currentFolder });
        this.settings = {};
        this.settings[this.filesExclude] = this.buildExcludes(modules);
    }

    private buildExcludes(modules: bazelmodule.BazelModule[]): {} {
        let exclude: any = {};
        if (modules) {
            modules.//
                filter((module) => false === module.selected).//
                forEach((module) => {
                    exclude[module.name] = true;
                });
        }
        return exclude;
    }
}

class VsCodePath {
    constructor(public path: string) {
    }
}
