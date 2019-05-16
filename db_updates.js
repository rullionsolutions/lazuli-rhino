
"use strict";

var Rhino = require("lazuli-rhino/index.js");
var SQL = require("lazuli-sql/index.js");

Rhino.App.define("dbUpdateC12444", function () {
    SQL.Connection.shared.executeUpdate(
        "UPDATE sy_user_type SET perm_rsrc = IF (id IN ('hiring_mgr', 'perm'), 'Y', 'N') )"
    );
});
