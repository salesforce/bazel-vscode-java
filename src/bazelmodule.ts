export class BazelModule {
    name: string;
    selected: boolean;
    constructor(name: string, selected: boolean) {
        this.name = name;
        this.selected = selected;
    }
}