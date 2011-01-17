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
        ['^%(?:[^%\\n][^\\n]+)?', 'LINEEVAL'],
        ['\\s*\\n+\\s*', 'SPACE'],
        ['<%[^%](?:%+(?:%>|[^>])|[^%])*%>', 'EVAL'],
        ['(?:<(?:%%|[^%\\n]|$)|[^<\\n])+', 'TEXT']
    ];

    var tokenRegExp = [];
    for (var i = 0, ii = token_expressions.length; i < ii; i++) {
        tokenRegExp.push(token_expressions[i][0]);
    }
    tokenRegExp = new RegExp('(' + tokenRegExp.join(')|(') + ')', 'gm');

    var tokens = [];
    var tokenMatch;

    tokens.push({type: 'SPACE', match: '', value: '', offset: 0}); // Match /^/
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
        } else if (token.type == 'LINEEVAL') {
            token.type = 'EVAL';
            token.value = token.match.substring(1);
            token.match = '%' + token.value;
        }

        tokens.push(token);
    }
    tokens.push({type: 'SPACE', match: '', value: '', offset: text.length}); //Match /$/

    return tokens;
}

function optimize(tokens) {
    // SPACE EVAL+ SPACE -> trim(SPACE) EVAL+ trim(SPACE)
    // SPACE -> TEXT
    // TEXT TEXT+ -> TEXT
    var token, i, ii;
    tokens = tokens.concat();
    i = 0;
    ii = tokens.length;
    while (i < ii) {
        token = tokens[i];
        if (token.type == 'SPACE') {
            var j = i + 1;
            if (j < ii) {
                var token__ = tokens[j];
                while (j < ii && token__.type == 'EVAL' && !token__.isEcho) { token__ = tokens[++j]; }

                if (1 < j-i && j < ii && token__.type == 'SPACE') {
                    var match;
                    match = token.match.replace(/[^\n]*$/, '');
                    tokens[i] = token = {type: 'SPACE', match: match, value: match, offset: token.offset};
                    match = token__.match.replace(/^[^\n]*\n?/, '');
                    tokens[j] = {type: 'SPACE', match: match, value: match, offset: token__.offset + (token__.match.length - match.length)};
                }
            }
            token = {type: 'TEXT', match: token.match, value: token.value, offset: token.offset};
            tokens[i] = token;
        }
        i++;
    }

    var newTokens = [];
    i = 0;
    ii = tokens.length;
    while (i < ii) {
        token = tokens[i];
        if (token.type == 'TEXT') {
            var j = i + 1;
            if (j < ii && tokens[j].type == 'TEXT') {
                var match = token.match;
                var value = token.value;
                var token_ = tokens[j];

                // Micro-optimize common case of TEXT(SPACE) TEXT TEXT(SPACE)
                //  Use addition if only a few concats are needed.
                var k = Math.min(j + 3, ii);
                do {
                    match += token_.match;
                    value += token_.value;
                    token_ = tokens[++j];
                } while (j < k && token_.type == 'TEXT');

                if (j < ii && token_.type == 'TEXT') {
                    match = [match];
                    value = [value];
                    do {
                        match.push(token_.match);
                        value.push(token_.value);
                        token_ = tokens[++j];
                    } while (j < ii && token_.type == 'TEXT');
                    match = match.join('');
                    value = value.join('');
                }

                token = {type: 'TEXT', match: match, value: value, offset: tokens[i].offset};
                i = j;
            } else {
                i++;
            }

            if (token.value.length > 0) {
                newTokens.push(token);
            }
        } else {
            newTokens.push(token);
            i++;
        }
    }

    return newTokens;
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
    emittedCode = emittedCode.replace(/(<%)%|%(%>)|(^%|\n%)%/g, '$1$2$3');

    return emittedCode;
}

function compile(text) {
    var tokens, code;
    tokens = lex(text);
    tokens = optimize(tokens);
    code = generate(tokens);
    return code;
}

function execute(code, context, renderMethods) {
    var renderOperation = [];
    var key, methodName;
    function echo(value) {
        if (value != null) {
            renderOperation.push(value.toString());
        }
    }

    // Build context for evaluation of code
    var _context = {};
    for (key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
            _context[key] = context[key];
        }
    }
    // RenderMethods are special and get augmented with the renderOperation
    //  passed in as their intial argument.
    for (methodName in renderMethods) {
        if (Object.prototype.hasOwnProperty.call(renderMethods, methodName) &&
            !Object.prototype.hasOwnProperty.call(_context, methodName)) {
            _context[methodName] = function (method) {
                function invokeRenderMethod() {
                    var _arguments = Array.prototype.slice.call(arguments)
                    _arguments.unshift(renderOperation);
                    return method.apply(this, _arguments);
                };
                return invokeRenderMethod;
            } (renderMethods[methodName]);
        }
    }
    // If not defined already in the context then add echo (used by <%=)
    if (!Object.prototype.hasOwnProperty.call(_context, 'echo')) {
        _context['echo'] = echo;
    }

    (new Function('context', 'with (context) {'+code+'}'))(_context);

    return renderOperation.join('');
}

exports.lex = lex;
exports.optimize = optimize;
exports.generate = generate;
exports.compile = compile;

exports.execute = execute;
