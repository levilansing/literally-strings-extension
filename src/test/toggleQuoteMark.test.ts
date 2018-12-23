import * as assert from 'assert';
import {toggleStringEscapes} from '../util/toggleStringEscapes';

suite("ToggleQuoteMark", function () {
  test("removes escapes where possible", function () {
    assert.deepEqual(toggleStringEscapes(`'1: it\\'s \\'Friday\\''`, '"', 0, 21), {
      string: `"1: it's 'Friday'"`,
      start: 0,
      end: 18
    });
    assert.deepEqual(toggleStringEscapes("'2: it\\'s `Friday`'", '"', 0, 0), {
      string: "\"2: it's `Friday`\"",
      start: 0,
      end: 0
    });
    assert.deepEqual(toggleStringEscapes(`"3: it\\'s \\ Friday /"`, '`', 12, 18), {
      string: "`3: it's \\ Friday /`",
      start: 11,
      end: 17
    });
  });

  test("adds escapes where necessary", function () {
    assert.deepEqual(toggleStringEscapes(`\`it's "Friday" \`yay\`\``, '"', 0, 0), {
      string: `"it's \\"Friday\\" \`yay\`"`,
      start: 0,
      end: 0
    });
  });

  test("manages strings inside interpolation as best it can", function () {
    assert.deepEqual(toggleStringEscapes(`\`1: it\\'s \${'"Friday"'} "quote"\``, '"', 0, 0), {
      string: `"1: it's \${'\\"Friday\\"'} \\"quote\\""`,
      start: 0,
      end: 0
    });
    assert.deepEqual(toggleStringEscapes(`\`2: it's \${'"Friday"'} "quote"\``, "'", 0, 0), {
      string: `'2: it\\'s \${\\'"Friday"\\'} "quote"'`,
      start: 0,
      end: 0
    });
    assert.deepEqual(toggleStringEscapes(`'3: it\\'s \${\\'"Friday"\\'} "quote"'`, "`", 0, 0), {
      string: `\`3: it's \\\${'"Friday"'} "quote"\``,
      start: 0,
      end: 0
    });
  });
});
