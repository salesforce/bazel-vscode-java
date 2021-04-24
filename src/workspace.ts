import * as bazelmodule from './bazelmodule';

export class VsCodeWorkspace {
    folders: VsCodePath[];
    settings: any;
    constructor(folder: string, modules: bazelmodule.BazelModule[]) {
        this.folders = [];
        this.folders.push({ path: folder });
        this.settings = {};
        this.settings['files.exclude'] = this.buildExcludes(modules);
    }

    private buildExcludes(modules: bazelmodule.BazelModule[]): {} {
        let exclude: any = {};
        if (modules) {
            modules.//
                filter((module) => false === module.selected).//
                forEach((module) => {
                    exclude[module.path] = true;
                });
        }
        return exclude;
    }
}

class VsCodePath {
    constructor(public path: string) {
    }
}
