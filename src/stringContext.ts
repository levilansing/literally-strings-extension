import {Selection, TextDocument} from 'vscode';

const TOKENIZER = /\/\/|\/\*|[\\/'"`]|\${|{|}|\$|\*\/|\*|[^\\/\*'"`{}\$]+|$/g;

export interface StringContext {
  escaped: boolean;
  inRegex: boolean;
  inString: boolean;
  inComment: boolean;
  wrapsString: boolean;
  quoteMark: string;
  literalStart: number;
  literalEnd: number;
}

interface TokenizerContext {
  escaped: boolean;
  inRegex: boolean;
  inString: boolean;
  inComment: boolean;
  wrapsString: boolean;
  quoteMark: string;
  commentMark: string;
  literalStart: number;
  literalEnd: number;
  index: number;
  blockDepth: number;
}

function emptyContext(): TokenizerContext {
  return {
    escaped: false,
    inRegex: false,
    inString: false,
    inComment: false,
    wrapsString: false,
    quoteMark: '',
    commentMark: '',
    literalStart: -1,
    literalEnd: -1,
    index: 0,
    blockDepth: 0
  };
}

export function tokenizerToStringContext(context: TokenizerContext) {
  const {escaped, inRegex, inString, inComment, wrapsString, quoteMark, literalStart, literalEnd} = context;
  return {escaped, inRegex, inString, inComment, wrapsString, quoteMark, literalStart, literalEnd};
}

export function stringContext(document: TextDocument, selection: Selection): StringContext {
  if (selection.start.line !== selection.end.line) {
    return tokenizerToStringContext(emptyContext());
  }
  return tokenizerToStringContext(buildContext(document.lineAt(selection.start.line).text, selection));
}

export function manualStringContext(line: string, selection: Selection) {
  if (selection.start.line !== selection.end.line) {
    return tokenizerToStringContext(emptyContext());
  }

  return tokenizerToStringContext(buildContext(line, selection));
}

export function buildContext(line: string, selection: Selection, iterator?: (context: TokenizerContext, token: string, stackDepth: number) => void) {
  TOKENIZER.lastIndex = 0;
  let selectionContext = emptyContext();
  let context = emptyContext();
  const stack = [];
  let stackUnderflow = false;

  let foundStart = false;
  let foundEnd = false;
  let escaping = false;
  let match: RegExpExecArray | null;
  while (match = TOKENIZER.exec(line)) {
    context.index = match.index;
    context.escaped = escaping;
    escaping = false;

    if (iterator) {
      iterator(context, match[0], stack.length);
    }

    if (!foundStart && match.index >= selection.start.character) {
      foundStart = true;
      Object.assign(selectionContext, context);
      if (match.index > selection.start.character) {
        selectionContext.escaped = false;
      }
      stackUnderflow = false;
      // continue until we find the end of the selection
    }

    if (
      foundStart && context.literalStart === selectionContext.literalStart
      && context.literalEnd !== -1 && selectionContext.literalEnd === -1
    ) {
      selectionContext.literalEnd = context.literalEnd;
      if (foundEnd) {
        return selectionContext;
      }
    }

    if (!foundEnd && match.index >= selection.end.character) {
      foundEnd = true;

      if (context.literalStart === selection.start.character && context.literalEnd === selection.end.character - 1) {
        return Object.assign(selectionContext, {
          wrapsString: true,
          literalStart: context.literalStart,
          literalEnd: context.literalEnd,
          quoteMark: context.quoteMark
        });
      }

      if (
        !context.inString && !context.inRegex || !selectionContext.inString && !selectionContext.inRegex
        || context.literalStart !== selectionContext.literalStart
        || stackUnderflow || context.blockDepth !== selectionContext.blockDepth
      ) {
        // not in a string/regex or selection spans more than one literal
        return Object.assign(selectionContext, {inRegex: false, inString: false});
      }
      // continue until we find the end of the string/regex
    }

    switch (match[0]) {
      case "'":
      case '"':
      case '`':
        if (context.inRegex || context.escaped || context.inComment || (context.inString && context.quoteMark !== match[0])) {
          continue;
        }
        context.quoteMark = match[0];
        if ((context.inString = !context.inString)) {
          context.literalStart = match.index;
          context.literalEnd = -1;
        } else {
          context.literalEnd = match.index;
        }
        break;

      case '/':
        if (context.inString || context.escaped || context.inComment) {
          continue;
        }
        if ((context.inRegex = !context.inRegex)) {
          context.literalStart = match.index;
          context.literalEnd = -1;
        } else {
          context.literalEnd = match.index;
        }
        break;

      case '${':
        if (context.inString && context.quoteMark === '`') {
          stack.push(context);
          context = emptyContext();
          context.blockDepth = stack[stack.length - 1].blockDepth;
        }
        break;

      case '{':
        if (!context.inString && !context.inRegex && !context.inComment) {
          context.blockDepth++;
        }
        break;

      case '}':
        if (!context.inRegex && !context.inString && !context.inComment) {
          context.blockDepth--;
          if (context.blockDepth < 0) {
            if (stack.length > 0) {
              context = stack.pop()!;
            } else {
              stackUnderflow = true;
            }
          }
        }
        break;

      case '\\':
        if (!context.escaped && !context.inComment) {
          escaping = true;
        }
        break;

      case '//':
      case '/*':
        if (!context.inString && !context.inRegex && !context.inComment) {
          context.inComment = true;
          context.commentMark = match[0];
        }
        break;

      case '*/':
        if (context.inComment && context.commentMark === '/*') {
          // ends a comment
          context.inComment = false;
        }
        break;

      case '':
        return selectionContext;
    }
  }
  return selectionContext;
}
