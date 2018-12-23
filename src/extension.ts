// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {commands, ExtensionContext, Position, Selection, TextEditor, TextEditorEdit, TextDocument} from 'vscode';
import {stringContext, StringContext, manualStringContext} from './util/stringContext';
import {toggleStringEscapes} from './util/toggleStringEscapes';
import {cloneSelection, cloneSelectionStart} from './util/cloneSelection';

function insertMarkdownTick(selection: Selection, textEditor: TextEditor, edit: TextEditorEdit) {
	const document = textEditor.document;

	// if there is a selection, just wrap the selection
	if (!selection.start.isEqual(selection.end)) {
		const text = document.getText(selection);
		edit.replace(selection, `\`${text}\``);
		return cloneSelection(selection, 1, 1);
	}

	if (
		selection.start.character === 2 && document.getText(cloneSelection(selection, -2, 0)) === '``'
		&& document.lineAt(selection.start.line).text.length === 2
	) {
		// assume typing a triple back tick
		edit.insert(selection.start, '`\n```');
		return cloneSelection(selection, 1, 1);
	} else if (document.getText(cloneSelection(selection, 0, 1)) === '`') {
		// allow typing over an identical quote character
		return cloneSelection(selection, 1, 1);
	} else if (selection.start.character >= 1 && document.getText(cloneSelection(selection, -1, 0)) === '`') {
		// insert just one if we're immediately after another backtick'
		edit.insert(selection.start, '`');
		return cloneSelection(selection, 1, 1);
	}

	edit.insert(selection.start, '``');
	return cloneSelection(selection, 1, 1);
}

function insertQuote(quote: string, selection: Selection, textEditor: TextEditor, edit: TextEditorEdit) {
	const document = textEditor.document;
	const context = stringContext(document, selection);

	// if there is no selection
	if (selection.start.isEqual(selection.end)) {
		if (document.getText(cloneSelection(selection, 0, 1)) === quote && !context.escaped) {
			// allow typing over an identical quote character, unless our cursor is escaped
			return cloneSelection(selection, 1, 1);
		} else if (context.inRegex) {
			// insert a single quote
			edit.insert(selection.start, quote);
			return cloneSelection(selection, 1, 1);
		} else if (context.inString) {
			// insert a single quote, but escape it if necessary
			if (context.quoteMark === quote) {
				edit.insert(selection.start, '\\' + quote);
				return cloneSelection(selection, 2, 2);
			}
			edit.insert(selection.start, quote);
			return cloneSelection(selection, 1, 1);
		} else {
			// check if we WOULD be in a string if we typed one quote
			let line = document.lineAt(selection.start.line).text;
			line = line.slice(0, selection.start.character) + quote + line.slice(selection.start.character);
			const newContext = manualStringContext(line, cloneSelection(selection, 1, 1));
			if (newContext.inString && newContext.literalEnd > 0) {
				// insert just one quote to create the string
				edit.insert(selection.start, quote);
				return cloneSelection(selection, 1, 1);
			}

			// insert two quotes
			edit.insert(selection.start, quote + quote);
			return cloneSelection(selection, 1, 1);
		}
	} else {
		const text = document.getText(selection);
		// if the selection is wrapping a string
		if (context.wrapsString) {
			if (context.quoteMark === quote) {
				// make no changes if we're already quoted with the desired quotes
				return selection;
			}
			// toggle the escapes as needed
			const quotedText = toggleStringEscapes(text, quote).string;
			edit.replace(selection, quotedText);
			return cloneSelection(selection, 0, quotedText.length - text.length);
		} else if (context.inString) {
			if (context.quoteMark === quote && !context.escaped) {
				// use escapes on new quotes
				edit.replace(selection, `\\${quote}${text}\\${quote}`);
				return cloneSelection(selection, 2, 2);
			} else {
				// wrap with quotes (no escapes needed)
				edit.replace(selection, `${quote}${text}${quote}`);
				return cloneSelection(selection, 1, 1);
			}
		} else {
			// wrap with quotes, and escape as needed
			const quotedText = toggleStringEscapes(`-${text}-`, quote).string;
			edit.replace(selection, quotedText);
			return cloneSelection(selection, 1, quotedText.length - text.length - 1);
		}
	}
}

function insertAndToggleString(context: StringContext, selection: Selection, replaceBefore: string, replaceAfter: string, document: TextDocument, edit: TextEditorEdit) {
	const line = selection.start.line;
	const stringSelection = new Selection(new Position(line, context.literalStart), new Position(line, context.literalEnd + 1));
	const wholeString = document.getText(stringSelection);
	const result = toggleStringEscapes(wholeString, '`', selection.start.character - context.literalStart, selection.end.character - context.literalStart);
	const replacement =
		result.string.substr(0, result.start)
		+ replaceBefore + result.string.substr(result.start, result.end - result.start)
		+ replaceAfter + result.string.substr(result.end);
	edit.replace(stringSelection, replacement);
	const offset = context.literalStart + result.start - selection.start.character;
	return cloneSelection(selection, offset + replaceBefore.length, offset + replaceBefore.length);
}

function insertInterpolation(selection: Selection, textEditor: TextEditor, edit: TextEditorEdit) {
	const document = textEditor.document;
	const context = stringContext(document, selection);
	const text = document.getText(selection);

	// if there is no selection, just insert the $
	if (selection.start.isEqual(selection.end)) {
		edit.insert(selection.start, '$');
		return cloneSelection(selection, 1, 1);
	}

	// if we're in a string (single-line) do some interpolating
	if (context.inString) {
		if (context.quoteMark === '`') {
			edit.replace(selection, `\${${text}}`);
			return cloneSelection(selection, 2, 2);
		} else {
			return insertAndToggleString(context, selection, '${', '}', document, edit);
		}
	} else {
		edit.replace(selection, '$');
		return cloneSelectionStart(selection, 1);
	}
}

function insertOpenCurly(selection: Selection, textEditor: TextEditor, edit: TextEditorEdit) {
	const document = textEditor.document;
	const text = document.getText(selection);
	// multi-line, wrap with {}
	if (selection.start.line !== selection.end.line) {
		edit.replace(selection, `{${text}}`);
		return cloneSelection(selection, 1, 1);
	}

	const prevChar = document.getText(new Selection(new Position(selection.start.line, selection.start.character - 1), new Position(selection.start.line, selection.start.character)));
	const nextChar = document.getText(new Selection(new Position(selection.start.line, selection.end.character), new Position(selection.start.line, selection.end.character + 1)));
	if (prevChar === '$' && nextChar !== '{' && nextChar !== '}') {
		const context = stringContext(document, selection);
		if (context.inString) {
			if (context.quoteMark !== '`') {
				return insertAndToggleString(context, selection, '{', '}', document, edit);
			}
			// otherwise fall through to a normal insertion
		}
	}

	if (selection.start.character === selection.end.character && (nextChar === '{' || nextChar === '}')) {
		edit.insert(selection.start, `{`);
		return cloneSelection(selection, 1, 1);
	}

	edit.replace(selection, `{${text}}`);
	return cloneSelection(selection, 1, 1);
}

function forEachSelection(textEditor: TextEditor, callback: (selection: Selection, textEditor: TextEditor, edit: TextEditorEdit) => Selection) {
	const selections: Selection[] = [];
	textEditor.edit((edit) => {
		for (const selection of textEditor.selections) {
			try {
				selections.push(callback(selection, textEditor, edit));
			} catch (e) {
				console.log(e);
			}
		}
	}).then((success) => {
		textEditor.selections = selections;
	});
}

const jsLanguages = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];
function isLangInterpolationKnown(languageId: string) {
	return jsLanguages.indexOf(languageId) >= 0;
}

// this method is called when your extension is activated
export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerTextEditorCommand('extension.ls-single-quote', (textEditor: TextEditor) => {
		forEachSelection(textEditor, (selection, textEditor, edit) => insertQuote("'", selection, textEditor, edit));
	}));

	context.subscriptions.push(commands.registerTextEditorCommand('extension.ls-double-quote', (textEditor: TextEditor) => {
		forEachSelection(textEditor, (selection, textEditor, edit) => insertQuote('"', selection, textEditor, edit));
	}));

	context.subscriptions.push(commands.registerTextEditorCommand('extension.ls-back-tick-quote', (textEditor: TextEditor) => {
		if (textEditor.document.languageId === 'markdown') {
			forEachSelection(textEditor, (selection, textEditor, edit) => insertMarkdownTick(selection, textEditor, edit));
		} else {
			forEachSelection(textEditor, (selection, textEditor, edit) => insertQuote('`', selection, textEditor, edit));
		}
	}));

	context.subscriptions.push(commands.registerTextEditorCommand('extension.ls-insert-interpolation', (textEditor: TextEditor) => {
		if (isLangInterpolationKnown(textEditor.document.languageId)) {
			forEachSelection(textEditor, (selection, textEditor, edit) => insertInterpolation(selection, textEditor, edit));
		} else {
			forEachSelection(textEditor, (selection, textEditor, edit) => {
				edit.replace(selection, '$');
				return cloneSelectionStart(selection, 1);
			});
		}
	}));

	context.subscriptions.push(commands.registerTextEditorCommand('extension.ls-insert-open-curly', (textEditor: TextEditor) => {
		if (isLangInterpolationKnown(textEditor.document.languageId)) {
			forEachSelection(textEditor, (selection, textEditor, edit) => insertOpenCurly(selection, textEditor, edit));
		} else {
			forEachSelection(textEditor, (selection, textEditor, edit) => {
				const text = textEditor.document.getText(selection);
				edit.replace(selection, `{${text}}`);
				return cloneSelection(selection, 1, 1);
			});
		}
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
