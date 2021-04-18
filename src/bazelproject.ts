import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as bazelmodule from './bazelmodule';
import * as projectparser from './bazelprojectparser';


export class BazelProject {
    sourceWorkspace: string;
    sourceFolder: string;
    targetFolder: string;

    constructor(src: string, trg: string) {
        this.sourceWorkspace = src;
        this.targetFolder = trg;
        this.sourceFolder = path.dirname(this.sourceWorkspace);

    }

    openProject(modules: string[]) {
        this.buildBazelProject(modules);
        // this.makeTargetFolder();
        // this.buildSymlinks(modules);
        // this.openFolder(this.targetFolder);
        this.openFolder(this.sourceFolder);
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

    private buildBazelProject(modules: string[]) {
        const bazelprojectFile = path.join(this.sourceFolder, '.bazelproject');
        if (modules && modules.length > 0) {
            if (fs.existsSync(bazelprojectFile)) {
                fs.renameSync(bazelprojectFile, bazelprojectFile + '.' + Date.now());
            }
            let fileContent = 'directories:\n';
            modules.forEach((moduleName) => { fileContent = fileContent + '  ' + moduleName + '\n'; });
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
            // const targetWorkspaceFile = path.join(this.targetFolder, 'WORKSPACE');
            // fs.symlinkSync(this.sourceWorkspace, targetWorkspaceFile);
        }
    }
}