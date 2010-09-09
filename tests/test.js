var interpreter = require('../ejs');

var tests = new (function () {
    var executeEJSTemplate = function (text, context, renderContext) {
        var code = interpreter.compile(text);
        var output = interpreter.execute(code, context, renderContext);
        return output;
    };
    var assertInterpreterResult = function (input, output) {
        return function () {
            var actual = executeEJSTemplate(input);
            assert.equal(actual, output, (actual + "!=" + output).replace(/\n/g, '\\n'));
        };
    };
    var lineStrippingAssertTest = function (evalText, leadingSpace) {
        return function () {
            assertInterpreterResult(evalText, "")();
            assertInterpreterResult(evalText + "\n", "")();
            assertInterpreterResult("\n" + evalText + "\n", "\n")();
            assertInterpreterResult("\n" + evalText + "\n\n", "\n\n")();
            assertInterpreterResult("\n\n" + evalText + "\n\n", "\n\n\n")();
            assertInterpreterResult("\n\n" + evalText + "  \n\n", "\n\n\n")();
            assertInterpreterResult("\n\n" + evalText + "  \n  \n", "\n\n  \n")();
            if (leadingSpace) {
                assertInterpreterResult("\n\n  " + evalText + "\n\n", "\n\n\n")();
                assertInterpreterResult("\n  \n" + evalText + "\n\n", "\n  \n\n")();
            }
        };
    };

    this.test_whitespace_line_eval =
        lineStrippingAssertTest("% /* no-op */", false);
    this.test_whitespace_single_eval =
        lineStrippingAssertTest("<% /* no-op */%>", true);
    this.test_whitespace_two_eval =
        lineStrippingAssertTest("<% /* no-op */ %><% /* no-op */ %>", true);
    this.test_whitespace_n_eval =
        lineStrippingAssertTest("<% /* no-op */ %><%# /* no-op */ %><% /* no-op */ %>", true);

    this.test_interupted_space_eval =
        assertInterpreterResult("\n  <% /* no-op */ %>  <% /* no-op */ %>  \n\n",
            "\n      \n\n");
    this.test_interupted_text_eval =
        assertInterpreterResult("\n  <% /* no-op */ %>__<% /* no-op */ %>  \n\n",
            "\n  __  \n\n");
    this.test_interupted_echo_eval =
        assertInterpreterResult("\n  <% /* no-op */ %><%=\"$$\"%><% /* no-op */ %>  \n\n",
            "\n  $$  \n\n");

    this.test_line_eval_recognition1 =
        assertInterpreterResult("%   echo('%%%')", "%%%");
    this.test_line_eval_recognition2 =
        assertInterpreterResult("%%  echo('%%%')", "%  echo('%%%')");
    this.test_line_eval_recognition3 =
        assertInterpreterResult("%%% echo('%%%')", "%% echo('%%%')");
    this.test_line_eval_recognition4 =
        assertInterpreterResult(" %% echo('%%%')", " %% echo('%%%')");
    this.test_line_eval_recognition5 =
        assertInterpreterResult("  % echo('%%%')", "  % echo('%%%')");

    this.test_eval_recognition1 =
        assertInterpreterResult("<%%>", "<%>");
    this.test_eval_recognition2 =
        assertInterpreterResult("<%echo('<%%%%>')%>", "<%%>");
    this.test_eval_recognition3 =
        assertInterpreterResult("<%echo('%%><%%')%>", "%><%");
    this.test_eval_recognition4 =
        assertInterpreterResult("<%echo('<%%%%%>')%>", "<%%%>");
    this.test_eval_recognition5 =
        assertInterpreterResult("<%echo('%%>%<%%')%>", "%>%<%");
    this.test_eval_recognition6 =
        assertInterpreterResult("<%%<% echo(\"<%%%%%>\"); %>%%>", "<%<%%%>%>");
    this.test_eval_recognition7 =
        assertInterpreterResult("<%%<% echo(\"%%>%<%%\"); %>%%>", "<%%>%<%%>");

    this.test_execution1 = function () {
        var called = false;
        var method = function () {
            called = true;
            return "called";
        };
        var input = "<%=specialJSMethod()%>";
        var output = executeEJSTemplate(input, {specialJSMethod: method});

        assert.ok(called, "Defined method not called.");
        assert.equal(output, "called", "Echo did not take place");
    };
    this.test_execution2 = function () {
        var called = false;
        var method = function (renderOperation) {
            called = true;
            renderOperation.push("called");
        };
        var input = "<%=specialJSMethod()%>";
        var output = executeEJSTemplate(input, {}, {specialJSMethod: method});

        assert.ok(called, "Defined method not called.");
        assert.equal(output, "called", "Modification of renderOperation did not work.");
    };
    this.test_isolation1 = function () {
        var context = {setting: true}

        var input = "<%setting = false%>";
        var output = executeEJSTemplate(input, context, {});

        assert.ok(context['setting'], "Template execution modified a value of the passed context.");
    };
    this.test_isolation2 = function () {
        var input = "YES<%delete renderOperation; renderOperation = ['NO']%>";
        var output = executeEJSTemplate(input, {}, {});

        assert.equal(output, "YES", "Template execution modified a value outside of its immediate scope.");
    };
})()

logan.run(tests);
