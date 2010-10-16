# EJS #

## What Is It? ##
Embedded JavaScript is just like [Embedded Ruby](http://ruby-doc.org/stdlib/libdoc/erb/rdoc/), which is basically the same as PHP's template markup. It is a simple language that is well suited to the problem of generating content made mostly of static text with occasional code for managing control flow.

## Syntax ##
### Statements ###
Code embedded in the document is surrounded by the `<%` and `%>` tokens. All other text is output verbatim (excluding some leading and trailing whitespace). The embedded code can be a simple statement, like `<%var x = 3.14%>`, or an intertoken fragment of something like a block statement.

For example:
    <% for (var i = 0; i < 3; i++) { %>
    repeat
    <% } %>
outputs:
    repeat
    repeat
    repeat

If you want to use the strings '<%' and '%>' in your template, but do not want them to be treated as tokens marking the beginning and ending of embedded code then you may use the `<%%` and `%%>` tokens and these will be be replaced accordingly.

### Expressions ###
Since `echo`ing a value is a common operation, there is a way to do this in the language. Placing `<%=` and `%>` tokens around a JavaScript expression will output the string value of the expression's result in-place.

    <% for (var i = 0; i < 3; i++) { %>
    repeat (i=<%=i%>)
    <% } %>
outputs:
    repeat (i=0)
    repeat (i=1)
    repeat (i=2)

When compiled, the expression is put as an argument to the `echo()` function that is available within the template. Invoking `echo` manually inside a template will perform the same operation.

WARNING: Please remember that, while this syntax is terse and useful, the user is responsible for escaping this value appropriately. Please consult OWASP's [XSS prevention](http://www.owasp.org/index.php/Cross_Site_Scripting_Flaw) standard practices.

## Line Fragments ##
Starting a line with the `%` token is shorthand for surrounding the entire line by the statement tokens, `<%` and `%>` (except that `%=` doesn't get special treatment). An actual '%' character at the beginning of a line is represented by the `%%` token.

    %%
    % echo('Lorem ipsum dolar sit amet.');
    %%
outputs:
    %
    Lorem ipsum dolar sit amet.
    %

## Use ##
The ejs module contains a compiler and a basic implementation for evaluating a compiled template. Caching, file loading, and other enhancements are left as an exercise for the user. A template can be rendered like so:

    result = ejs.execute(ejs.compile(templateText))

The `ejs.js` file follows the CommonJS module exporting convention. If the code is going to be run in a environment that does not have built-in support for this (like a browser), bookending the file like this will suffice:

    ejs = (function () {var exports = {};(function (exports) {
    /* ejs code */
    }(exports)); return exports;}());

## License ##
Released under zlib

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
