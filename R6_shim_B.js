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
x.build = x.io.File;

