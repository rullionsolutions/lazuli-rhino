"use strict";

// change tokens DB_USER, DB_PSWD, DB_HOST, paths, server ident and server purpose
// and copy to: webapps/node_modules/

var SQL = require("lazuli-sql/index.js");
var Rhino = require("lazuli-rhino/index.js");


// Allow for override settings in local_overrides.js
SQL.Connection.rdbms_host = SQL.Connection.rdbms_host || "DB_HOST";
SQL.Connection.rdbms_port = SQL.Connection.rdbms_port || "3306";
SQL.Connection.rdbms_user = SQL.Connection.rdbms_user || "DB_USER";
SQL.Connection.rdbms_pswd = SQL.Connection.rdbms_pswd || "DB_PSWD";

SQL.Connection.remote_rdbms_user = "DB_USER";
SQL.Connection.remote_rdbms_pswd = "DB_PSWD";

Rhino.App.log_path = Rhino.App.log_path || "/path/to/logs/";

Rhino.App.base_uri = Rhino.App.base_uri || "https://localhost:8443/";
Rhino.App.local_disk = Rhino.App.local_disk || "/path/to/";
Rhino.App.shared_disk = Rhino.App.shared_disk || "/remote/path/";
Rhino.App.server_ident = Rhino.App.server_ident || "localhost / localhost";
Rhino.App.server_purpose = Rhino.App.server_purpose || "devt";
Rhino.App.iterations = Rhino.App.iterations || 10000;
