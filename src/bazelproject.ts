import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as bazelmodule from './bazelmodule';
import * as projectparser from './bazelprojectparser';
import * as vscodeworkspace from './workspace';

export class BazelProject {
    private readonly codeWorkspaceExt: string = '.code-workspace';
    private readonly codeWorkspaceFile: string = 'workspace' + this.codeWorkspaceExt;

    private _sourceWorkspace: string;
    private _sourceFolder: string;
    private _targetFolder: string;

    constructor(src: string, trg: string) {
        this._sourceWorkspace = src;
        this._targetFolder = trg;
        this._sourceFolder = path.dirname(this._sourceWorkspace);

    }

    public get sourceWorkspace(): string {
        return this._sourceWorkspace;
    }

    public get sourceFolder(): string {
        return this._sourceFolder;
    }

    public get targetFolder(): string {
        return this._targetFolder;
    }

    public openProject(modules: bazelmodule.BazelModule[]) {
        // this.makeTargetFolder();
        // this.buildBazelProject(modules, this.targetFolder);
        // this.buildSymlinks(modules);
        // this.openFolder(this.targetFolder);
        this.buildBazelProject(modules, this._sourceFolder);
        this.buildCodeWorkspace(modules, this._sourceFolder);
        this.openFolder(path.join(this._sourceFolder, this.codeWorkspaceFile));
    }

    public lookupModules(): bazelmodule.BazelModule[] {
        let modules: bazelmodule.BazelModule[] = [];
        if (fs.existsSync(this._sourceFolder)) {
            const parser: projectparser.BazelProjectParser = new projectparser.BazelProjectParser();
            parser.readBazelProject(this._sourceFolder);
            const preselectedModules: string[] = parser.getModules();

            const topmodules: bazelmodule.BazelModule[] = this.readfolders(undefined);
            topmodules.forEach((current) => {
                const isBuild: boolean = this.buildHierarchy(current, preselectedModules);
                if (true === isBuild) {
                    modules.push(current);
                }
            });
        }
        return modules;
    }

    private buildCodeWorkspace(modules: bazelmodule.BazelModule[], folder: string) {
        const codeWorkspaceFile: vscodeworkspace.VsCodeWorkspace = new vscodeworkspace.VsCodeWorkspace(folder, modules);
        const vscodeWorkspace = path.join(folder, this.codeWorkspaceFile);
        const content: string = JSON.stringify(codeWorkspaceFile, null, 2);

        fs.writeFileSync(vscodeWorkspace, content);
    }

    private buildBazelProject(modules: bazelmodule.BazelModule[], folder: string) {
        const bazelprojectFile = path.join(folder, '.bazelproject');
        if (modules && modules.length > 0) {
            if (fs.existsSync(bazelprojectFile)) {
                fs.renameSync(bazelprojectFile, bazelprojectFile + '.' + Date.now());
            }
            let fileContent = 'directories:' + os.EOL;
            modules.//
                filter((module) => true === module.selected).//
                forEach((module) => {
                    const path: string = module.path;
                    fileContent = fileContent + '  ' + path + os.EOL;
                });
            fs.writeFileSync(bazelprojectFile, fileContent);
        } else if (fs.existsSync(bazelprojectFile)) {
            fs.unlinkSync(bazelprojectFile);
        }
    }

    private openFolder(folder: string) {
        const uri: vscode.Uri = vscode.Uri.file(folder);
        vscode.commands.executeCommand('vscode.openFolder', uri);
    }

    private makeTargetFolder() {
        const targetPath = path.resolve(this._targetFolder);
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath);
        }
    }

    private buildSymlinks(modules: string[]) {
        if (modules && modules.length > 0) {
            modules.forEach((sourceModule) => {
                const moduleName: string = path.basename(sourceModule);
                const targetModulePath = path.join(this._targetFolder, moduleName);
                const sourceModulePath = path.join(this._sourceFolder, moduleName);
                fs.symlinkSync(sourceModulePath, targetModulePath);
            });
            const targetWorkspaceFile = path.join(this._targetFolder, 'WORKSPACE');
            fs.symlinkSync(this._sourceWorkspace, targetWorkspaceFile);
        }
    }

    private buildHierarchy(parent: bazelmodule.BazelModule, preselected: string[]): boolean {
        let isBuild = false;

        if (fs.existsSync(path.join(this.sourceFolder, parent.path, 'BUILD'))) {
            isBuild = true;
        } else if (fs.existsSync(path.join(this.sourceFolder, parent.path, 'BUILD.bazel'))) {
            isBuild = true;
        }

        const selected = preselected.find((name) => name === parent.path);
        if (selected) {
            isBuild = true;
            parent.selected = true;
        }

        const nested: bazelmodule.BazelModule[] = this.readfolders(parent);
        if (nested) {
            nested.forEach(module => {
                const buildModule: boolean = this.buildHierarchy(module, preselected);
                if (buildModule) {
                    parent.nested.push(module);
                    isBuild = true;
                }
            });
        }
        return isBuild;
    }

    private readfolders(base: bazelmodule.BazelModule | undefined): bazelmodule.BazelModule[] {
        let absolutePath: string = (base ? path.join(this.sourceFolder, base.path) : this.sourceFolder);
        const nested: bazelmodule.BazelModule[] = fs.readdirSync(absolutePath, { withFileTypes: true }).//
            filter(file => ((!file.name.startsWith('.')) && (!file.name.startsWith('src')) && file.isDirectory())).//
            map(file => {
                const module: bazelmodule.BazelModule = new bazelmodule.BazelModule();
                module.name = file.name;
                module.selected = false;
                module.path = base ? path.join(base.path, file.name) : file.name;
                return module;
            });
        return nested;
    }
}