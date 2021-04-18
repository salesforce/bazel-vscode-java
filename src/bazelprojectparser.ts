import * as fs from 'fs';
import * as path from 'path';

export class BazelProjectParser {
    private directories: string[];
    private targets: string[];

    constructor() {
        this.directories = [];
        this.targets = [];
    }

    getModules(): string[] {
        return this.getDirectories();
    }

    getDirectories(): string[] {
        return this.directories;
    }

    getTargets(): string[] {
        return this.targets;
    }

    readBazelProject(folder: string) {
        const DIRECTORIES_SECTION: string = "directories:";
        const TARGETS_SECTION: string = "targets:";

        const bazelProjectFile: string = path.join(folder, '.bazelproject');
        if (fs.existsSync(bazelProjectFile)) {
            const content: string = fs.readFileSync(bazelProjectFile, { encoding: 'UTF-8', flag: 'r' });
            const lines = content.split(/\r?\n/);
            const filteredLines = lines.filter( //
                (line) => line && line.trim().length > 0 && (!line.trim().startsWith('#'))  //
            );
            const option = lines.shift();
            let isDirectories: boolean = false;

            filteredLines.forEach((line) => {
                line = line.trim();
                if (DIRECTORIES_SECTION === line) {
                    isDirectories = true;
                } else if (TARGETS_SECTION === line) {
                    isDirectories = false;
                } else {
                    if (isDirectories) {
                        this.directories.push(line);
                    } else {
                        this.targets.push(line);
                    }
                }
            });
        }
    }
}