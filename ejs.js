/*

  Copyright (C) 2010 Chad Weider

  This software is provided 'as-is', without any express or implied
  warranty.  In no event will the authors be held liable for any damages
  arising from the use of this software.

  Permission is granted to anyone to use this software for any purpose,
  including commercial applications, and to alter it and redistribute it
  freely, subject to the following restrictions:

  1. The origin of this software must not be misrepresented; you must not
     claim that you wrote the original software. If you use this software
     in a product, an acknowledgment in the product documentation would be
     appreciated but is not required.
  2. Altered source versions must be plainly marked as such, and must not be
     misrepresented as being the original software.
  3. This notice may not be removed or altered from any source distribution.

*/

var escapableChars = new RegExp("[\\\\\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]", 'g');
var metaChars = {'\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"' : '\\"', '\\': '\\\\'};
function replaceChar(char) {
    return metaChars[char] || '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
}
function escapeJSString(string) {
    escapableChars.lastIndex = 0;
    string = string.replace(escapableChars, replaceChar);
    return '"' + string + '"';
}

function lex(text) {
    var token_expressions = [
        ['<%[^%](?:%+(?:%>|[^>])|[^%])*%>', 'EVAL'],
        ['(?:<(?:%%|[^%]|$)|[^<])+', 'TEXT']
    ];

    var tokenRegExp = [];
    for (var i = 0, ii = token_expressions.length; i < ii; i++) {
        tokenRegExp.push(token_expressions[i][0]);
    }
    tokenRegExp = new RegExp('(' + tokenRegExp.join(')|(') + ')', 'g');

    var tokens = [];
    var tokenMatch;
    while (tokenMatch = tokenRegExp.exec(text)) {
        var token = {
            value: tokenMatch[0],
            match: tokenMatch[0],
            offset: tokenMatch.index};

        // Find what group (token) matched
        var i = 1;
        while (!tokenMatch[i]) { i++; }
        token.type = token_expressions[i-1][1];

        // Strip <% and %> tokens of EVAL tokens and account for annotations
        if (token.type == 'EVAL') {
            if (token.match.charAt(2) == '=') {
                token.isEcho = true;
                token.value = token.match.substring(3, token.match.length-2);
            } else if (token.match.charAt(2) == '#') {
                token.isComment = true;
                token.value = token.match.substring(3, token.match.length-2);
            } else {
                token.value = token.match.substring(2, token.match.length-2);
            }
        }

        tokens.push(token);
    }

    return tokens;
}

function generate(tokens) {
    var emittedCode = [];

    for (var i = 0, ii = tokens.length; i < ii; i++) {
        token = tokens[i];
        if (token.type == 'TEXT' || token.type == 'SPACE') {
            emittedCode[i] = 'echo(' + escapeJSString(token.value) + ');';
        } else if (token.type == 'EVAL') {
            if (token.isEcho) {
                emittedCode[i] = 'echo((' + token.value + '));';
            } else if (token.isComment) {
                continue;
            } else {
                emittedCode[i] = token.value;
            }
        } else {
          throw new Error("Unknown token of type \""+token.type+"\".");
        }
    }

    emittedCode = emittedCode.join('\n');
    emittedCode = emittedCode.replace(/(<%)%|%(%>)/g, '$1$2');

    return emittedCode;
}

function compile(text) {
    var tokens, code;
    tokens = lex(text);
    code = generate(tokens);
    return code;
}

function execute(code, context) {
    var text = [];
    var key;
    function echo(value) {
        if (value != null) {
            text.push(value.toString());
        }
    }

    // Build context for evaluation of code
    var _context = {};
    for (key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
            _context[key] = context[key];
        }
    }
    // If not defined already in the context then add echo (used by <%=)
    if (!Object.prototype.hasOwnProperty.call(_context, 'echo')) {
        _context['echo'] = echo;
    }

    (new Function('context', 'with (context) {'+code+'}'))(_context);

    return text.join('');
}

exports.lex = lex;
exports.generate = generate;
exports.compile = compile;

exports.execute = execute;