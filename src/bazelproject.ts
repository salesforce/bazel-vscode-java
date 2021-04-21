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

    sourceWorkspace: string;
    sourceFolder: string;
    targetFolder: string;

    constructor(src: string, trg: string) {
        this.sourceWorkspace = src;
        this.targetFolder = trg;
        this.sourceFolder = path.dirname(this.sourceWorkspace);

    }

    openProject(modules: bazelmodule.BazelModule[]) {
        // this.makeTargetFolder();
        // this.buildBazelProject(modules, this.targetFolder);
        // this.buildSymlinks(modules);
        // this.openFolder(this.targetFolder);
        this.buildBazelProject(modules, this.sourceFolder);
        this.buildCodeWorkspace(modules, this.sourceFolder);
        this.openFolder(path.join(this.sourceFolder, this.codeWorkspaceFile));
    }

    lookupModules(): bazelmodule.BazelModule[] {
        const parser: projectparser.BazelProjectParser = new projectparser.BazelProjectParser();
        parser.readBazelProject(this.sourceFolder);
        const selectedModules: string[] = parser.getModules();
        let modules: bazelmodule.BazelModule[] = [];
        if (fs.existsSync(this.sourceFolder)) {
            const files: string[] = fs.readdirSync(this.sourceFolder, { withFileTypes: true }).//
                filter(file => ((!file.name.startsWith('.')) && file.isDirectory())).//
                map(file => file.name);
            files.forEach(file => {
                const selected = selectedModules.find((name) => name === file);
                let exist: boolean = false;
                if (selected) {
                    exist = true;
                }
                const module: bazelmodule.BazelModule = new bazelmodule.BazelModule(file, exist);
                modules.push(module);
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
                    const name: string = module.name;
                    fileContent = fileContent + '  ' + name + os.EOL;
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
        const targetPath = path.resolve(this.targetFolder);
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath);
        }
    }

    private buildSymlinks(modules: string[]) {
        if (modules && modules.length > 0) {
            modules.forEach((sourceModule) => {
                const moduleName: string = path.basename(sourceModule);
                const targetModulePath = path.join(this.targetFolder, moduleName);
                const sourceModulePath = path.join(this.sourceFolder, moduleName);
                fs.symlinkSync(sourceModulePath, targetModulePath);
            });
            const targetWorkspaceFile = path.join(this.targetFolder, 'WORKSPACE');
            fs.symlinkSync(this.sourceWorkspace, targetWorkspaceFile);
        }
    }
}