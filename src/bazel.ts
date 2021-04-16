import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class BazelStructure {
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
        this.openFolder();
    }

    lookupModules(): string[] {
        let modules: string[] = [];
        if (fs.existsSync(this.sourceFolder)) {
            const files: string[] = fs.readdirSync(this.sourceFolder, { withFileTypes: true }).//
                filter(file => ((!file.name.startsWith('.')) && file.isDirectory())).//
                map(file => file.name);
            files.forEach(file => {
                modules.push(file);
            });
        }
        return modules;
    }

    private buildBazelProject(modules: string[]) {
        const bazelprojectFile = path.join(this.sourceFolder, '.bazelproject');
        if (modules && modules.length > 0) {
            if (fs.existsSync(bazelprojectFile)) {
                fs.truncateSync(bazelprojectFile);
            }
            let fileContent = 'directories:\n';
            modules.forEach((moduleName) => { fileContent = fileContent + '  ' + moduleName + '\n' });
            fs.writeFileSync(bazelprojectFile, fileContent);
        } else if (fs.existsSync(bazelprojectFile)) {
            fs.unlinkSync(bazelprojectFile);
        }
    }

    private openFolder() {
        const uri: vscode.Uri = vscode.Uri.file(this.sourceFolder);
        vscode.commands.executeCommand('vscode.openFolder', uri);
    }

    private makeTargetFolder() {
        const targetPath = path.resolve(this.targetFolder);
        if (!fs.existsSync(targetPath)) {
            fs.vmkdirSync(targetPath);
        }
    }

    private buildSymlinks() {
        const modules: string[] = this.lookupModules();
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