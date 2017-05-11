/* global x */

"use strict";

// Shim to be used in main.js
// * AFTER requiring the lazuli modules and
// * BEFORE x.rhino.app = x.rhino.App.initialize(...)

// sanity check method - ensures key doesn't already exist anywhere in prototype chain
// eslint-disable-next-line no-extend-native
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
// eslint-disable-next-line no-extend-native
Object.prototype.overrideProperty = function (key, value) {
    if (this.hasOwnProperty(key)) {         // eslint-disable-line no-prototype-builtins
        throw new Error("key_already_exists: " + key);
    }
    if (typeof this[key] === "undefined") {
        throw new Error("key_not_exists: " + key);
    }
    this[key] = value;
};

Object.prototype.forOwn = function (funct) {
    var prop;
    if (typeof funct !== "function") {
        funct = this[funct];
    }
    for (prop in this) {
        if (this.hasOwnProperty(prop) && typeof this[prop] !== "function") {
            funct(prop, this[prop]);
        }
    }
};

// sanity check method - reassign key if it already exist in this object
// eslint-disable-next-line no-extend-native
Object.prototype.reassignProperty = function (key, value) {
    if (!this.hasOwnProperty(key)) {         // eslint-disable-line no-prototype-builtins
        throw new Error("key_not_exists: " + key);
    }
    this[key] = value;
};


x.core.Base.defineProperty = x.core.Base.define;
x.core.Base.overrideProperty = x.core.Base.override;
x.core.Base.reassignProperty = x.core.Base.reassign;


// eslint-disable-next-line no-extend-native
Array.prototype.copy = function () {
    var new_arr = [];
    var i;
    for (i = 0; i < this.length; i += 1) {
        new_arr[i] = this[i];
    }
    return new_arr;
};

/*
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
*/

x.core.Collection.override("define", function (key, value) {
    if (this[key] === value) {
        return null;    // allow reassigning the same value to be silently ignored
    }                   // to accommodate R6 code such as: x.areas.define("sy", x.base.Area.clone({
    // where the clone() call now automatically adds the new object to the collection
    return x.core.Base.define.call(this, key, value);
});

x.core.Collection.override("defineProperty", x.core.Collection.define);

x.core.Collection.reassign("getItemTypeObject", function () {
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
x.areas = x.data.areas;
x.FieldSet = x.data.FieldSet;
x.Entity = x.data.Entity;
x.entities = x.data.entities;
x.fields = x.data.fields;
x.LoV = x.data.LoV;
x.base.AsyncJob = x.rhino.AsyncJob;
// x.data.forms = x.data.forms;

// backward-compatibility of overrides
x.data.Entity.define("init", function () {});
x.data.Entity.defbind("callInitOnCloneShim", "clone", function () {
    this.init();
});
x.data.Text.define("afterTransChange", function () {});

// events shim
x.EventStack = x.core.OrderedMap;

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
        if (!that.hasHappen(event)) {
            that.register(event);           // auto-register unrecognized events as happens
        }
        that.defbind(id, event, script);
    };
});


x.session = x.access;
x.roles = x.access.roles;
x.MenuItem = x.access.MenuItem;
x.Session = x.access.Session;

x.pages = x.ui.pages;
x.sections = x.ui.sections;
x.Page = x.ui.Page;
x.ContextPage = x.ui.ContextPage;
x.pages.sy_bulk_action = x.ui.BulkActionPage.clone({
    id: "sy_bulk_action",
});
x.Transaction = x.data.Transaction;
x.MessageManager = x.core.MessageManager;

x.ui.Page.define("events", x.core.OrderedMap.clone({
    id: "events",
    events: [],
}));

x.ui.Page.defbind("eventShim", "clone", function () {
    var that = this;
    this.events = this.parent.events.clone({ id: this.id + ".events", });
    // this.events.events = this.parent.events.events.copy();
    this.events.add = function (id, event, script) {
        id += x.core.Format.getRandomString(6);       // prevent property name collisions
        if (!that.hasHappen(event)) {
            that.register(event);           // auto-register unrecognized events as happens
        }
        that.defbind(id, event, script);
    };
});


x.sql.escape = x.sql.Connection.escape;
x.sql.connection = x.sql.Connection.shared;

x.HttpServer = x.io.HttpServer;
x.XmlStream = x.io.XmlStream;

x.ui.Section.define("setup", function () {});
x.ui.Section.define("update", function () {});
x.sql.outer_join = x.sql.Query.Table.types.outer_join;
x.sql.inner_join = x.sql.Query.Table.types.inner_join;

x.ConfirmPage = x.ui.ConfirmPage;

x.Transaction.define("addEmail", function (spec) {
    var email;
    if (this.page) {
        email = this.page.addEmail(spec);
    } else {
        spec.trans = this;
        spec.session = this.session;
        email = Data.entities.get("ac_email").create(spec);
        email.send();
    }
    return email;
});
