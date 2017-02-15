/* global Packages */

"use strict";

var Core = require("lapis-core/index.js");
var Rhino = require("lazuli-rhino/index.js");

var async_jobs = [];
var threads = [];

/**
 * Asynchronous Queue of Jobs
 * @type {x.Base}
 */
module.exports = Core.Base.clone({
    id: "AsyncJob",
    interval: 1000 * 60,                // 1 minutes
    start_inside_tomcat: true,
});


module.exports.defbind("add_to_queue", "clone", function () {
    async_jobs.push(this);
});


module.exports.define("run", function () {
    this.object.loop();
});


module.exports.define("loop", function () {
    var go = true;
    while (go) {
        this.info("doing iteration...");
        try {
            this.iteration();
            Packages.java.lang.Thread.currentThread().sleep(this.interval);
        } catch (e) {            // interrupted
            this.info("run() interrupted (" + e.toString() + ")");
            go = false;
        }
    }
});


module.exports.define("start", function () {
    var runnable = new Packages.java.lang.Runnable(this);
    var thread = new Packages.java.lang.Thread(runnable, this.id +
        " in " + Rhino.app.app_id + " [" + Rhino.app.runtime_id + "]");
    threads.push(thread);
    thread.start();
});


Rhino.App.defbind("startMonitor", "loadEnd", function () {
    async_jobs.forEach(function (async_job) {
        async_job.info("should be started? " + !!Rhino.app.inside_tomcat +
            " && " + !!async_job.start_inside_tomcat);
        if (Rhino.app.inside_tomcat && async_job.start_inside_tomcat) {
            async_job.start();
        }
    });
});


Rhino.App.defbind("stopMonitor", "stop", function () {
    threads.forEach(function (thread) {
        thread.interrupt();
    });
});
