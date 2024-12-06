import { BazelProjectView } from './types';

export interface BazelVscodeExtensionAPI {
	readonly parseProjectFile: BazelProjectView;
}
