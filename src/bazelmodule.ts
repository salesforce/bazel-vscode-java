
export class BazelModule {
    path: any;
    name: string;
    selected: boolean;
    nested: BazelModule[];

    constructor() {
        this.path = undefined;
        this.name = '';
        this.selected = false;
        this.nested = [];
    }

}