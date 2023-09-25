import { StatusBarAlignment, ThemeColor, window } from 'vscode';
import { Commands } from './commands';

export namespace BazelRunStatus {
	const bazelStatus = window.createStatusBarItem(StatusBarAlignment.Left, 1);

	bazelStatus.command = Commands.OPEN_BAZEL_BUILD_STATUS_CMD;
	bazelStatus.text = `$(sync~spin) bazel building`;
	bazelStatus.backgroundColor = new ThemeColor('statusBarItem.warningBackground');

	export const show = () => bazelStatus.show();
	export const hide = () => bazelStatus.hide();

}