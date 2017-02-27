/* global x */

"use strict";

// Shim to be used in main.js
// * AFTER requiring the lazuli modules and
// * BEFORE x.rhino.app = x.rhino.App.initialize(...)

// sanity check method - ensures key doesn't already exist anywhere in prototype chain
Object.prototype.defineProperty = function (key, value, doc) {
    if (typeof this[key] !== "undefined") {
        throw new Error("key_already_exists: " + key);
    }
    this[key] = value;
    if (doc) {
        this[key].doc = doc;
    }
};

// sanity check method - ensures key doesn't already exist in this object
Object.prototype.overrideProperty = function (key, value) {
    if (this.hasOwnProperty(key)) {
        throw new Error("key_already_exists: " + key);
    }
    if (typeof this[key] === "undefined") {
        throw new Error("key_not_exists: " + key);
    }
    this[key] = value;
};

// sanity check method - reassign key if it already exist in this object
Object.prototype.reassignProperty = function (key, value) {
    if (!this.hasOwnProperty(key)) {
        throw new Error("key_not_exists: " + key);
    }
    this[key] = value;
};


x.core.Base.defineProperty = x.core.Base.define;
x.core.Base.overrideProperty = x.core.Base.override;
x.core.Base.reassignProperty = x.core.Base.reassign;

x.core.Base.define("getObject", function (str) {
    var parts;
    var obj;
    var i;

    if (typeof str !== "string") {
        this.throwError("invalid argument, not a string: " + str);
    }
    parts = str.split(".");
    if (parts[0] !== "x") {
        this.throwError("invalid ref string: " + str);
    }
    obj = x;
    for (i = 1; i < parts.length; i += 1) {
        if (!obj[parts[i]]) {
            this.throwError("invalid_ref_string: " + str + ", " + i);
        }
        obj = obj[parts[i]];
    }
    return obj;
});

x.core.Collection.override("getItemTypeObject", function () {
    if (typeof this.item_type === "string") {       // R6 shim...
        return this.getObject(this.item_type);
    }
    return this.item_type;
});

// backward-compatibility absolute references
x.base = x.core;
x.Base = x.core.Base;
x.log = x.core.Base;
x.OrderedMap = x.core.OrderedMap;
x.core.Base.getCollection = x.core.Base.getObject;

x.base.Area = x.data.Area;
x.areas = x.data.Area.areas;
x.FieldSet = x.data.FieldSet;
x.Entity = x.data.Entity;
x.entities = x.data.Entity.entities;
x.fields = x.data.Text.fields;
x.LoV = x.data.LoV;
x.base.AsyncJob = x.rhino.AsyncJob;
x.data.forms = x.data.Form.forms;

// backward-compatibility of overrides
x.data.Entity.define("init", function () {});
x.data.Entity.defbind("callInitOnCloneShim", "clone", function () {
    this.init();
});
x.data.Text.define("afterTransChange", function () {});

// events shim
x.data.Entity.define("events", x.core.OrderedMap.clone({
    id: "events",
    events: [],
}));

x.data.Entity.defbind("eventShim", "clone", function () {
    var that = this;
    this.events = this.parent.events.clone({ id: this.id + ".events", });
    // this.events.events = this.parent.events.events.copy();
    this.events.add = function (id, event, script) {
        id += x.core.Format.getRandomString(6);       // prevent property name collisions
        that.defbind(id, event, script);
    };
});


x.session = x.access;
x.roles = x.access.Role.roles;
x.MenuItem = x.access.MenuItem;
x.Session = x.access.Session;

x.pages = x.ui.Page.pages;
x.sections = x.ui.Section.sections;
x.Page = x.ui.Page;
x.ContextPage = x.ui.ContextPage;


x.ui.Page.defbind("eventShim", "clone", function () {
    var that = this;
    this.events = {
        add: function (id, event, script) {
            id += x.core.Format.getRandomString(6);       // prevent property name collisions
            that.defbind(id, event, script);
        },
    };
});


x.sql.escape = x.sql.Connection.escape;
x.sql.connection = x.sql.Connection.shared;

x.HttpServer = x.io.HttpServer;

x.ui.Section.define("setup", function () {});
x.ui.Section.define("update", function () {});

