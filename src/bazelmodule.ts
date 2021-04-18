export class BazelModule {
    private name: string;
    private selected: boolean;
    constructor(name: string, selected: boolean) {
        this.name = name;
        this.selected = selected;
    }

    getModule(): string {
        return this.name;
    }

    getSelected(): boolean {
        return this.selected;
    }
}