var fs = require('fs');
var ejs = require('./compiler');
var StreamStream = require('./util').StreamStream;
var Script = process.binding('evals').Script;

var Template = function (template, filename) {
  this._text = template;
  this._filename = filename;
  this._script = null;
};
Template.prototype = new function () {
  this.compile = function () {
    var code = ejs.compile(this._text);
    delete this.text;
    this._script = new Script(code, this._filename);
  };
  this.execute = function (context, renderMethods, continuation) {
    var renderOperation = new StreamStream();
    if (!this._script) {
      this.compile();
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
      function echo(value) {
        if (value != null) {
          renderOperation.write(value.toString());
        }
      }
      _context['echo'] = echo;
    }

    continuation(renderOperation);
    this._script.runInNewContext(_context);
    renderOperation.end();
  };
  this.executeBuffered = function (context, renderMethods, continuation) {var self = this;
    this.execute(context, renderMethods, function (renderOperation) {
      var buffer = "";
      chunks = 0;
      renderOperation.on('data', function (chunk) {
        buffer += chunk;
      });
      renderOperation.on('end', function () {
        continuation(buffer);
      });
    });
  };
}();

exports.Template = Template;
