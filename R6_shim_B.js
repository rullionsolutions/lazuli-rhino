/* global x, load, Packages */

"use strict";

// Shim to be used in main.js
// * AFTER x.rhino.app = x.rhino.App.initialize(...)


x.protected_properties = x.rhino.app;
x.app = x.rhino.app;
x.lib = x.core.Format;
x.lib.define("getProjectRootDir", function () {
    return x.rhino.app.getProjectRootDir();
});
x.lib.define("realReadFile", function (path) {
    return x.io.File.readFile(path);
});
x.lib.define("toDate", function (str) {
    var pattern = new RegExp("([0-9]{4})-([0-9]{2})-([0-9]{2})"),
        parts   = pattern.exec(str),
        date;

    if (!parts || parts.length < 4) {
        throw x.Exception.clone({ id: "invalid_date_format", text: str + " is an invalid date; must be in the format 'yyyy-mm-dd'"});
    }
    date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10)-1, parseInt(parts[3], 10));
    date.setHours(12);        // Set time to midday to avoid timezone problems when working with dates only
    return date;
});
x.build = x.io.File;

/**
 * The root Archetype of a thrown Exception, containing stack trace and other useful information
 * @type {x.Base}
 */
x.Exception = x.Base.clone({
    id: "Exception",
    stack_trace: null, // String stack trace block (JavaScript lines only, Java lines filtered out), with lines separated by newline characters
});


/**
 * To create a new Exception object; preferred usage: 'throw x.Exception.clone({ id: xxx, y: z, etc })' - note NO 'new' keyword
 * @param  {object} props containing 'id' parameter, and any other properties useful to know for the situation - these are output to log
 * @return {string}       newline-separated stack trace
 */
x.Exception.override("clone", function (props) {
    var obj = x.Base.clone.call(this, props);
    var stack_trace_elements = java.lang.Thread.currentThread().getStackTrace();
    var i;
    var delim = "";

    obj.stack_trace = "";
    for (i = 0; i < stack_trace_elements.length; i += 1) {
        if (stack_trace_elements[i].getClassName().indexOf("org.mozilla.javascript.gen") === 0 && stack_trace_elements[i].getLineNumber() > 0) {
            obj.stack_trace += delim + (stack_trace_elements[i].getFileName() || stack_trace_elements[i].getClassName()) + ":" + stack_trace_elements[i].getLineNumber();
            delim = "\n";
        }
    }
    if (!obj.stack_trace) {
        obj.stack_trace = "[unobtainable]";
    }
    return obj;
});


x.Exception.override("toString", function (nice) {
    var number;
    if (!nice) {
        return this.view();
    } else if (Object.hasOwnProperty.call(this, "text")) {
        return this.text;
    } else {
        number = Math.floor(Math.random() * 10000);
        x.log.error(number, this.view());
        return "A system error has occured: #" + number;
    }
});
