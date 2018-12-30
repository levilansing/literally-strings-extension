import * as assert from 'assert';
import {buildContext, tokenizerToStringContext} from '../util/stringContext';
import {createSelection} from '../util/cloneSelection';

suite("StringContext", function () {
    test("when in a regex", function() {
        //                                     |-|
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 22, 25))),
            {
                escaped: false,
                inRegex: true,
                inString: false,
                inComment: false,
                wrapsString: false,
                quoteMark: "'",
                literalStart: 21,
                literalEnd: 27,
            }
        );
    });

    test("when in a string", function () {
        //                          |
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 13, 13))),
            {
                escaped: false,
                inRegex: false,
                inString: true,
                inComment: false,
                wrapsString: false,
                quoteMark: "'",
                literalStart: 4,
                literalEnd: 13,
            }
        );
    });

    test("when outside a string and regex", function () {
        //                          |
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 14, 14))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: false,
                wrapsString: false,
                quoteMark: "'",
                literalStart: 4,
                literalEnd: 13,
            }
        );
    });

    test("when escaped", function () {
        //                          |
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 12, 12))),
            {
                escaped: true,
                inRegex: false,
                inString: true,
                inComment: false,
                wrapsString: false,
                quoteMark: "'",
                literalStart: 4,
                literalEnd: 13,
            }
        );
    });

    test("when selection extends across strings", function () {
        //                         |----------|
        const line = `const foo = 'str1' + 'str2';`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 13, 25))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: false,
                wrapsString: false,
                quoteMark: "'",
                literalStart: 12,
                literalEnd: 17,
            }
        );
    });

    test("when selecting a full string", function () {
        //                |-----------|
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 4, 14))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: false,
                wrapsString: true,
                quoteMark: "'",
                literalStart: 4,
                literalEnd: 13,
            }
        );
    });

    test("when selecting over interpolation", function () {
        //                           |-----------|
        const line = 'const foo = `test ${`foo`}bar`';
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 15, 28))),
            {
                escaped: false,
                inRegex: false,
                inString: true,
                inComment: false,
                wrapsString: false,
                quoteMark: "`",
                literalStart: 12,
                literalEnd: 29,
            }
        );
    });

    test("when selecting partially into interpolation", function () {
        //                           |------|
        const line = 'const foo = `test ${`foo`}bar`';
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 15, 23))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: false,
                wrapsString: false,
                quoteMark: "`",
                literalStart: 12,
                literalEnd: -1,
            }
        );
    });

    test("when in a comment", function () {
        //                                     |
        const line = '// const foo = `test ${`foo`}bar`';
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 25, 25))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: true,
                wrapsString: false,
                quoteMark: "",
                literalStart: -1,
                literalEnd: -1,
            }
        );
    });

    test("when in an inline comment", function () {
        //                                     |
        const line = '/* const foo = `test ${`foo`}bar` */';
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 25, 25))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                inComment: true,
                wrapsString: false,
                quoteMark: "",
                literalStart: -1,
                literalEnd: -1,
            }
        );
    });

    test("when outside an inline comment", function () {
        //                                         |
        const line = '/* bad form */ const foo = "test";';
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, createSelection(0, 29, 29))),
            {
                escaped: false,
                inRegex: false,
                inString: true,
                inComment: false,
                wrapsString: false,
                quoteMark: '"',
                literalStart: 27,
                literalEnd: 32,
            }
        );
    });
});
