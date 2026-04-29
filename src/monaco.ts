/* eslint-disable @typescript-eslint/method-signature-style */
import type {editor, IRange} from 'monaco-editor';
import type {Option, LiveOption} from './index.js'; // eslint-disable-line @typescript-eslint/no-shadow

export interface ILinter {
	lint?: (text: string, opt?: Option | LiveOption) => editor.IMarkerData[] | Promise<editor.IMarkerData[]>;
	fixer?: (text: string, rule?: string) => string | Promise<string>;
}
declare interface ITextModelLinter extends ILinter {
	glyphs: string[];
	timer?: number;
	disabled?: boolean;
	option?: Option | LiveOption;
}
export interface IWikitextModel extends editor.ITextModel {
	linter?: ITextModelLinter;
	lint?: (this: IWikitextModel, on?: boolean) => Promise<void>;
	getRangeAt?: (start: number, end: number) => IRange;
}
