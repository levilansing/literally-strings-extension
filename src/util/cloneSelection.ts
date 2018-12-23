import {Position, Selection} from 'vscode';

export function cloneSelection(selection: Selection, startOffset = 0, endOffset = 0) {
	const anchorOffset = selection.start === selection.anchor ? startOffset : endOffset;
	const activeOffset = selection.start === selection.anchor ? endOffset : startOffset;
	return new Selection(new Position(selection.anchor.line, selection.anchor.character + anchorOffset), new Position(selection.active.line, selection.active.character + activeOffset));
}

export function cloneSelectionStart(selection: Selection, offset = 0) {
	const position = new Position(selection.start.line, selection.start.character + offset);
	return new Selection(position, position);
}
