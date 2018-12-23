import * as assert from 'assert';
import {buildContext, tokenizerToStringContext} from '../util/stringContext';
import {Selection, Position} from 'vscode';

suite("StringContext", function () {
    test("when in a regex", function() {
        //                                     |-|
        const line = `if ('foo\\'"\\\\'.match(/foo'"/)) {`;
        assert.deepEqual(
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 22), new Position(0, 25)))),
            {
                escaped: false,
                inRegex: true,
                inString: false,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 13), new Position(0, 13)))),
            {
                escaped: false,
                inRegex: false,
                inString: true,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 14), new Position(0, 14)))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 12), new Position(0, 12)))),
            {
                escaped: true,
                inRegex: false,
                inString: true,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 13), new Position(0, 25)))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 4), new Position(0, 14)))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 15), new Position(0, 28)))),
            {
                escaped: false,
                inRegex: false,
                inString: true,
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
            tokenizerToStringContext(buildContext(line, new Selection(new Position(0, 15), new Position(0, 23)))),
            {
                escaped: false,
                inRegex: false,
                inString: false,
                wrapsString: false,
                quoteMark: "`",
                literalStart: 12,
                literalEnd: -1,
            }
        );
    });
});
