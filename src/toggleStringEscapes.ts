const TOKENIZER = /[\\/'"`]|\${|{|}|\$|[^\\/'"`{}\$]+|$/g;

export function toggleStringEscapes(content: string, toQuote: string, selectionStart = 0, selectionEnd = 0) {
  TOKENIZER.lastIndex = 0;
  content = 'A' + content.slice(1, content.length - 1) + 'Z';
  let result = '';
  let start = -1;
  let end = -1;
  let offset = 0;
  let escaped = false;
  let escaping = false;
  let match: RegExpExecArray | null;
  while ((match = TOKENIZER.exec(content))) {
    escaped = escaping;
    escaping = false;

    const token = match[0];
    switch (token) {
      case toQuote:
        if (!escaped) {
          result += '\\';
          offset++;
        }
        break;

      case "'":
      case '"':
      case '`':
        if (escaped) {
          result = result.slice(0, result.length - 1);
          offset--;
        }
        break;

      case '${':
        if (!escaped && toQuote === '`') {
          result += '\\';
          offset++;
        } else if (escaped && toQuote !== '`') {
          result = result.slice(0, result.length - 1);
          offset--;
        }
        break;

      case '\\':
        escaping = true;
        break;
    }

    if (start === -1 && match.index >= selectionStart) {
      start = selectionStart + offset;
    }
    if (end === -1 && match.index >= selectionEnd) {
      end = selectionEnd + offset;
    }

    result += token;

    if (token === '') {
      break;
    }
  }

  return {
    string: `${toQuote}${result.slice(1, result.length - 1)}${toQuote}`,
    start,
    end
  };
}
