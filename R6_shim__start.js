/* global x, load, print */

"use strict";

var x;

// x will have been defined already in runtime/java_bridge.js if running inside Tomcat
if (typeof x !== "object") {
    x = {};
}

x.runtime = {
    start_time: new Date(),
    modules_loaded: [],
};

x.loadModule = function (module) {
    if (x.runtime.modules_loaded.indexOf(module) > -1) {
        return;
    }
    x.runtime.print("module: " + module);
    x.loadFile(module + "/load.js");
    x.runtime.modules_loaded.push(module);
};

x.loadFile = function (file_name) {
    if (x.app && x.app.version && !x.app.home_dir) {
        x.app.home_dir = "../../node_modules/" + x.app.version;
        if (x.app.gitclone_suffix) {
            x.app.home_dir += "_" + x.app.gitclone_suffix;
        }
        x.app.home_dir += "/";
    }
    if (x.app.home_dir) {
        file_name = x.app.home_dir + file_name;
    }
    load(file_name);
};

/*
x.loadLocalSettings = function () {
    try {
        load("local_overrides.js");
        x.app.local_overrides_loaded = true;
    } catch (ignore) {
        x.app.local_overrides_loaded = false;
    }
};
*/

x.runtime.print = function (str) {
    print("LOAD  " + str);
};
