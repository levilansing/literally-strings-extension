import {Position, Selection} from 'vscode';

export function cloneSelection(selection: Selection, startOffset = 0, endOffset = 0) {
	const anchorOffset = selection.start === selection.anchor ? startOffset : endOffset;
	const activeOffset = selection.start === selection.anchor ? endOffset : startOffset;
	return new Selection(new Position(selection.anchor.line, selection.anchor.character + anchorOffset), new Position(selection.active.line, selection.active.character + activeOffset));
}

export function cloneSelectionStart(selection: Selection, offset = 0) {
	return createSelection(selection.start.line, selection.start.character + offset);
}

export function createSelection(line: number, start: number, end: number = start) {
	return new Selection(new Position(line, start), new Position(line, end));
}
