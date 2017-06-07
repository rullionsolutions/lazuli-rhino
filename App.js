/* global Packages, runCommand */

"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var IO = require("lazuli-io/index.js");
var Rhino = require("lazuli-rhino/index.js");
var Access = require("lazuli-access/index.js");

var initialized = false;


module.exports = Core.Base.clone({
    id: "App",
});


module.exports.register("initialize");
module.exports.register("loadStart");
module.exports.register("loadEnd");
module.exports.register("start");
module.exports.register("stop");
module.exports.register("build");
module.exports.register("rebuild");
module.exports.register("dailyBatch");
module.exports.register("generateDemoData");


module.exports.define("initialize", function (spec) {
    var app;
    if (initialized) {
        this.throwError("already initialized");
    }
    initialized = true;
    spec.id = spec.id || "app";
    spec.instance = true;
    spec.start_time = new Date();
    app = module.exports.clone(spec);
    app.setAppPath();
    // this.loadLocalSettings();
    app.setAppProperties();
    app.happen("initialize");
    app.happen("loadStart");
    return app;
});


module.exports.define("setAppPath", function () {
    function getPathString(path) {
        var java_file = new Packages.java.io.File(path);
        return String(java_file.getCanonicalPath()).replace(/\\/g, "/") + "/";
    }
    this.emerald_dir = getPathString(Packages.rsl.Main.getContextPath() || ".");
    this.webapps_dir = getPathString(this.emerald_dir + "../");
    this.sapphire_dir = getPathString(this.emerald_dir + "/") + "node_modules/sapphire";
    this.cdn_rsl_dir = this.cdn_rsl_dir || (this.server_purpose === "devt" ? "/cdn/rsl_dev/" : "/cdn/rsl-" + this.version + "/");
    if (this.gitclone_suffix) {
        this.sapphire_dir += "_" + this.gitclone_suffix;
    }
    this.sapphire_dir += "/";
    this.debug("emerald_dir: " + this.emerald_dir + ", webapps_dir: " + this.webapps_dir + ", sapphire_dir: " + this.sapphire_dir);
});


module.exports.define("setAppProperties", function () {
    var log_file_path;
    if (typeof this.server_purpose !== "string") {
        this.server_purpose = "test";
    }
    if (!this.isProd()) {
        this.title += " [" + this.server_purpose + "]";
    }
    if (this.server_purpose === "devt") {
        Core.Base.setLogLevel(Core.Base.log_levels.debug);
    }
    if (typeof this.app_id !== "string" && typeof this.service === "string") {
        this.app_id = this.service + "_" + this.server_purpose.substr(0, 4);
    }
    if (typeof SQL.Connection.database !== "string") {
        SQL.Connection.database = this.app_id;
    }
    if (this.inside_tomcat) {
        SQL.Connection.usePool();
    }
    if (typeof this.base_uri !== "string") {
        this.throwError("invalid base_uri: " + this.base_uri);
    }
    this.base_uri += this.app_id + "/";
    if (typeof this.shared_data !== "string") {
        this.shared_data = this.service;
    }
    if (this.inside_tomcat && this.log_path) {           // write logging to file
        log_file_path = this.log_path + this.app_id + "_" + (new Date()).internal() + ".log";
        this.openLogFile(new Packages.java.io.PrintWriter(log_file_path));
    }
});


module.exports.define("isProd", function () {
    return (this.server_purpose.substr(0, 4) === "prod");
});


module.exports.define("getProjectRootDir", function () {
    return this.emerald_dir;
});


// To be called at end of main.js
module.exports.define("start", function () {
    try {
        this.happen("loadEnd");
        this.happen("start");
        this.load_time = new Date();
        this.info("Runtime loaded in " + ((this.load_time.getTime() - this.start_time.getTime()) / 1000) + "ms");
    } catch (e) {
        this.report(e);
        this.fatal("error thrown in App::start - ALERT!");
        // this.stop();
    }
});


module.exports.define("stop", function () {
    this.info("App.stop() called on runtime started at: " + this.start_time);
    try {
        this.happen("stop");
    } catch (e) {
        this.report(e);
    }
    try {
        this.closeLogFile();
    } catch (e) {
        this.report(e);
    }
    if (!this.inside_tomcat) {
        this.output("stopping java - shouldn't happen inside Tomcat!");
        Packages.java.lang.System.exit(0);
    }
});


// Console Sugar
module.exports.define("getSession", function (user_id) {
    return Access.Session.getNewSession({ user_id: user_id, });
});


Access.Session.defbind("setAppProperties", "start", function () {
    this.server_purpose = Rhino.app.server_purpose;
    this.runtime_id = Rhino.app.id;
});


module.exports.defbind("closeAllSessions", "stop", function () {
    Access.Session.closeAll();
});


module.exports.define("tempLogLevelWrapper", function (override_log_level, callback) {
    var old_log_level = Core.Base.log_level;
    Core.Base.setLogLevel(override_log_level);
    callback.call(this);
    Core.Base.setLogLevel(old_log_level);
});


module.exports.define("batchMode", function () {
    Core.Base.line_prefix = "time";
});


// ------------------------------------------------------------------------------ Set-up Database
module.exports.define("build", function (opts) {
    var out = "";
    opts = opts || {};
    opts.log_level = opts.log_level || Core.Base.log_levels.warn;
    // make sure devs see problems - large amounts of debug/info during build
    this.tempLogLevelWrapper(opts.log_level, function () {
        out += this.destructiveRebuild(opts);
        // out += this.unpackConfig();
        out += this.happen("build", opts);
    });
    return out;
});


/**
* drops the database if exists; dependencies: none
*/
module.exports.define("dropDatabase", function () {
    if (SQL.Connection.database_exists) {
        SQL.Connection.shared.executeUpdate("DROP DATABASE IF EXISTS " + SQL.Connection.database);
    }
});


module.exports.define("createDatabase", function () {
    SQL.Connection.shared.executeUpdate("SET STORAGE_ENGINE=" + SQL.Connection.storage_engine);
    SQL.Connection.shared.executeUpdate("CREATE DATABASE " + SQL.Connection.database);
    SQL.Connection.database_exists = true;
    SQL.Connection.shared.executeUpdate("USE " + SQL.Connection.database);
});


/**
* Detect whether or not the database exists
* @return True if the database exists, otherwise false
*/
module.exports.define("isDatabasePresent", function () {
    try {
        SQL.Connection.shared.executeQuery("USE " + SQL.Connection.database);
        return true;
    } catch (ignore) {
        return false;
    }
});


module.exports.define("destructiveRebuild", function (opts) {
    // var file_name;
    var out;

    this.dropDatabase();
    this.createDatabase();
    opts.force_drop = (typeof opts.force_drop === "boolean") ? opts.force_drop : true;
    opts.destructive = (typeof opts.destructive === "boolean") ? opts.destructive : true;
    opts.rebuild_indexes_views = (typeof opts.rebuild_indexes_views === "boolean") ? opts.rebuild_indexes_views : true;
    out = this.rebuild(opts);
    // file_name = "../agate/build/build.sql";
    // if (this.version) {
    //     file_name = "../" + this.version + "/" + file_name;
    // }
    // this.execMySQLFile(file_name);
    return out;
});


/**
* Calls rebuild() on each entity in the configuration, passing options object supplied;
* throws exception if
* database not present
* @param Options object to pass to each entity.rebuild() call
* @return error string OR 1
*/
module.exports.define("rebuild", function (opts) {
    var error = "";
    var that = this;
    opts = opts || {};
    opts.log_level = opts.log_level || Core.Base.log_levels.info;
    if (!this.isDatabasePresent()) {
        this.throwError("Database not present");
    }
    // make sure devs see problems - large amounts of debug/info during build
    this.tempLogLevelWrapper(opts.log_level, function () {
        Data.entities.each(function (entity) {
            try {
                entity.rebuild(opts);
            } catch (e) {
                that.report(e);
                error += e + "\n";
            }
        });
        this.happen("rebuild");
    });
    return error || 1;
});


// Deferred sending of nightly batch emails
module.exports.define("sendEmails", function () {
    if (this.isProd()) {
        this.sendEmailsInternal();
    }
});


// Deferred sending of nightly batch emails
module.exports.define("sendEmailsInternal", function () {
    var email;
    var query = Data.entities.get("ac_email").getQuery();
    query.addCondition({ full_condition: "A.status = 'N' AND DATE(NOW()) = DATE(A.created_at)", });
    while (query.next()) {
        email = Data.entities.get("ac_email").getRow(query.getColumn("A.id").get());
        email.id = query.getColumn("A.id").get();
        email.send();
    }
    query.reset();
});


// ------------------------------------------------------------------------------ Daily Batch

/**
* Performs the daily batch process, calling this.backup(true) (unless suppressed with argument),
* then starts a session
* @param optional skip_backup as boolean - if supplied and true then the call to this.backup()
* is omitted
*/
module.exports.define("dailyBatch", function () {
    var start_time = new Date();
    var backup_file_size;
    var session;

    Rhino.app.smtp_mail_server = null; // don't send email during batch

    if (this.server_purpose === "prod_alt") {
        this.info("NOT running dailyBatch() on prod_alt server");
    } else {
        if (this.server_purpose === "prod") {
            backup_file_size = this.backup("month_rotate");
        } else if (this.server_purpose === "prep" && start_time.getDay() === 6) {       // Saturday
            this.restore("yesterday");
// slim and obfuscate then dump to disk
            this.slimDataForTesting();
            this.obfuscate();
            this.backup("test");
        } else if (this.server_purpose === "test" && start_time.getDay() === 0) {       // Sunday
            this.restore("test");      // use slimmed and obfuscated version
        }
        session = this.dailyBatchProcess(start_time, backup_file_size);
        if (this.cato_connection) {
            this.dailyBatchCatoSample(start_time, backup_file_size, session);
        }
    }
});


module.exports.define("dailyBatchProcess", function (start_time, backup_file_size) {
    var session = Access.Session.getNewSession({ user_id: "batch", });
    var duration;

    this.happen("dailyBatch", session);
    duration = (new Date()).getTime() - start_time.getTime();
    if (backup_file_size) {
        session.messages.add({
            id: "backup_file_size",
            type: "I",
            text: "Backup File Size: " + backup_file_size.toFixed(0),
            size: backup_file_size,
        });
    }
    session.messages.add({
        id: "daily_batch_session",
        type: "I",
        text: "Daily Batch Session Id: " + session.id,
        session_id: session.id,
    });
    session.messages.add({
        id: "daily_batch_app_server",
        type: "I",
        text: "Daily App Server Id: " + Rhino.app.app_server,
        app_server: Rhino.app.app_server,
    });
    session.messages.add({
        id: "daily_batch_db_server",
        type: "I",
        text: "Daily DB Server Id: " + Rhino.app.db_server,
        db_server: Rhino.app.db_server,
    });
    session.messages.add({
        id: "daily_batch_status",
        type: "I",
        text: "Daily Batch Status: " + session.getFinalStatus(),
        status: session.getFinalStatus(),
    });
    session.messages.add({
        id: "daily_batch_duration",
        type: "I",
        text: "Daily Batch Duration (ms): " + duration,
        duration: duration,
    });
    this.sample(session);
    session.close();
    return session;
});


module.exports.define("dailyBatchCatoSample", function (start_time, backup_file_size, session) {
    var conn;
    var stat;

    try {
        conn = Packages.java.sql.DriverManager.getConnection(this.cato_connection);
        stat = conn.createStatement(Packages.java.sql.ResultSet.TYPE_FORWARD_ONLY,
            Packages.java.sql.ResultSet.CONCUR_READ_ONLY);
        stat.executeUpdate("INSERT INTO is_env_smpl " +
            "( _key, env, server, timestamp, sample_dttm, dly_btch_session, dly_btch_status, dly_btch_durtn, backup_file_size ) " +
            " values ( concat( '" + this.app_id + "', unix_timestamp() ), '" + this.app_id + "', '" +
            this.hostname + "', unix_timestamp(), now(), '" + session.id + "', '" + session.getFinalStatus() + "', " +
            (((new Date()).getTime() - start_time.getTime()) / 1000).toFixed(0) + ", " +
            (typeof backup_file_size === "number" ? backup_file_size.toFixed(0) : "NULL") + " )");
    } catch (e3) {
        this.report(e3);
        try {
            if (conn) {
                conn.close();
            }
        } catch (e4) {
            this.report(e4);
        }
    }
});


module.exports.define("sample", function (session) {
    var out = [];
    var writer;

    this.info("sample()");
    session.messages.addJSON(out);
    // session.messages.clear("report");
    writer = new Packages.java.io.PrintWriter(Rhino.app.webapps_dir + "/samples/" + this.app_id + "_" + (new Date()).internal() + ".js");
    writer.println(JSON.stringify(out, null, 4));
    writer.close();
});


/**
* Call Connection.dumpDatabase() to create a database backup, then zips the SQL file
* @param optional month_rotate boolean - if true then the output filename is
* {x.protected_properties.local_disk}backups/{x.app.id}/{x.app.id}_backup_{dd}.zip
* @return output zip file size in bytes
*/
module.exports.define("backup", function (filename, options) {
    var backup_path = this.local_disk + "/backups/" + this.service;
    IO.File.mkdir(backup_path);
    options = options || {};
    backup_path += "/" + this.service + "_backup_";
    if (filename === "month_rotate") {
        backup_path += (new Date()).format("dd");
    } else if (filename === "timestamp" || !filename) {
        backup_path += (new Date()).format("yyyy-MM-dd_HH-mm-ss");
    } else {
        backup_path += filename;
    }
    backup_path += ".sql";
    if (typeof options.compress !== "boolean") {
        options.compress = true;
    }
    this.info("backup(" + backup_path + ")");
    this.dumpDatabase(backup_path, options);
    return IO.File.size(backup_path);
});


module.exports.define("restore", function (backup_path) {
    var command = SQL.Connection.composeMySQLCommand();
    if (backup_path === "today") {
        backup_path = this.shared_disk + "/backups/" + this.service + "/" +
            this.service + "_backup_" + Date.parse("today").format("dd") + ".sql.gz";
    } else if (backup_path === "yesterday") {
        backup_path = this.shared_disk + "/backups/" + this.service + "/" +
            this.service + "_backup_" + Date.parse("today+-1").format("dd") + ".sql.gz";
    } else if (backup_path === "test") {
        backup_path = this.shared_disk + "/backups/" + this.service + "/" +
            this.service + "_backup_test.sql.gz";
    }
    this.info("restore(" + backup_path + ")");
    if (backup_path.match(/\.gz$/)) {
        if (!this.isGzipAvailable()) {
            this.throwError("no gzip available to unzip this backup file: " + backup_path);
        }
        command = "gzip -d -c " + backup_path + " | " + command;
    } else {
        command += " < " + backup_path;
    }
    // this.restoreFromGzip(backup_path);
    return this.runOSCommand(command);
});


module.exports.define("slimDataForTesting", function () {
    Data.entities.each(function (entity) {
        entity.slimDataForTesting();
    });
});

module.exports.define("obfuscate", function () {
    Data.entities.each(function (entity) {
        entity.obfuscate();
    });
});


module.exports.define("isNashorn", function () {
    return (Packages.java.lang.System.getProperty("sun.java.command")
        && Packages.java.lang.System.getProperty("sun.java.command").indexOf("nashorn") > -1);
});


module.exports.define("isRhino", function () {
    return !this.isNashorn();
});


module.exports.define("isWindows", function () {
    return Packages.java.lang.System.getProperty("os.name").indexOf("Windows") > -1;
});


module.exports.define("isLinux", function () {
    return !this.isWindows();
});


module.exports.define("isGzipAvailable", function () {
    if (typeof this.gzip_available !== "boolean") {
        this.gzip_available = (this.runOSCommand("which gzip") === 0);
    }
    return this.gzip_available;
});


module.exports.define("runOSCommand", function (cmd) {
    var return_code;
    this.info("runOSCommand(" + cmd.replace(/--password=\w*/, "--password=xxxx").replace(/-p\w+/, "-pxxxx") + ")");
    if (this.isWindows()) {
        return_code = runCommand("cmd", "/c", cmd);
    } else {
        return_code = runCommand("/bin/sh", "-c", cmd);
    }
    if (return_code === 0) {
        this.debug("Return code: " + return_code);
    } else {
        this.error("Return code: " + return_code);
    }
    return return_code;
});


module.exports.define("execMySQLFile", function (filename) {
    this.info("execMySQLFile(" + filename + ")");
    return this.runOSCommand(SQL.Connection.shared.composeMySQLCommand() + " < " + filename);
});


module.exports.define("dumpDatabase", function (filename, options) {
    options = options || {};
    options.ignore_tables = options.ignore_tables || [];

    Data.entities.each(function (entity) {
        if (entity.exclude_dump) {
            options.ignore_tables.push(this.database + "." + entity.id);
            // excluded_tables  += separator + "--ignore-table=" + this.database + "." + entity.id;
            // separator = " ";
        }
    });

    return this.dumpMySQLData(filename, options);
});


module.exports.define("dumpMySQLData", function (filename, options) {
    var command = SQL.Connection.composeMySQLDumpCommand(options);
    if (options.compress) {
        if (!this.isGzipAvailable()) {
            this.throwError("no gzip available to zip this backup file: " + filename);
        }
        command += " | gzip > " + filename + ".gz";
    } else {
        command += "        > " + filename;
    }
    return this.runOSCommand(command);
});


module.exports.define("dumpMySQLDataThrowOnFail", function (filename, options) {
    var out = this.dumpMySQLData(filename, options);
    if (out !== 0) {
        this.throwError("dumpMySQLData() failed");
    }
});


module.exports.define("restoreFromGzip", function (filename) {
    this.info("restoreFromGzip(" + filename + ")");
    return this.runOSCommand("gzip -d -c " + filename + " | " + SQL.Connection.composeMySQLCommand());
});


/**
 * Run the archive process - mark transactions as archived if commit point older than n days,
 *  mark sessions as archived if end datetime is older than n days, then delete record update,
 *  email, export and visit records; archive workflow (tbd)
 * @param  {number} days_ago        defaults to 183 if not supplied
 * @param  {boolean} non_destructive
 */
module.exports.define("archive", function (days_ago, non_destructive) {
    var local_path = this.local_disk + "/data/" + this.service + "/archive/";
    var that = this;
    var max_trans;
    var max_session;
    var resultset1;
    var resultset2;
    var archive_file;
    var zip;

    this.info("archive()");
    if (!days_ago) {
        days_ago = 183;        // 6 months
    }

    try {
        resultset1 = SQL.Connection.shared.executeQuery(
            "SELECT id FROM ac_tx      WHERE stat_archive IS NULL AND commit_point < DATE_SUB( NOW(), INTERVAL " +
                days_ago + " DAY) ORDER BY commit_point DESC LIMIT 1");
        resultset2 = SQL.Connection.shared.executeQuery(
            "SELECT id FROM ac_session WHERE stat_archive IS NULL AND start_dttm   < DATE_SUB( NOW(), INTERVAL " +
                days_ago + " DAY) ORDER BY start_dttm   DESC LIMIT 1");

        max_trans = resultset1.next() ? SQL.Connection.getColumnString(resultset1, 1) : "";
        max_session = resultset2.next() ? SQL.Connection.getColumnString(resultset2, 1) : "";
    } catch (e) {
        this.report(e);
    } finally {
        SQL.Connection.shared.finishedWithResultSet(resultset1);
        SQL.Connection.shared.finishedWithResultSet(resultset2);
    }
    this.info("archive() max_trans: " + max_trans + ", max_session: " + max_session);
    if (!!max_trans && !!max_session) {
        IO.File.mkdir(local_path);
        zip = IO.File.createZipFile(local_path + "../archive_" + (new Date()).format("yyyy-MM-dd_HHmmss") + ".zip");

        try {
            Data.entities.each(function (entity) {
                that.info(entity.id + ".archive()");
                archive_file = entity.archive(local_path, non_destructive, max_trans, max_session);
                if (archive_file) {
                    zip.addFileToZip(local_path, archive_file);
                }
            });
            zip.close();
            SQL.Connection.shared.executeUpdate("UPDATE ac_tx      SET stat_archive = 'Q' WHERE id <= " + max_trans);
            SQL.Connection.shared.executeUpdate("UPDATE ac_session SET stat_archive = 'Q' WHERE id <= " + max_session);
        } catch (e) {
            this.report(e);
            zip.close();
        }
    }
});


// ----------------------------------------------------------------------- Upgrade to New Version
/**
* Loops over all modules in the configuration, calling function x.areas[module].upgrade(source_db)
* if available.
* @param required source_db string - the source database name to copy data from
*/
module.exports.define("upgrade", function (source_db, opts) {
    var source_conn;
    var that = this;

    opts = opts || {};
    opts.log_level = opts.log_level || Core.Base.log_levels.warn;
    if (!this.isDatabasePresent()) {
        this.throwError("Database not present");
    }
    this.tempLogLevelWrapper(opts.log_level, function () {
        Data.Area.areas.each(function (area) {
            if (typeof area.upgrade === "function") {
                area.upgrade(source_db);
            }
        });
        source_conn = SQL.Connection.clone({
            id: "source_conn",
            database: source_db,
        });
        Data.entities.each(function (entity) {
            try {
                entity.upgrade(source_conn);
            } catch (e) {
                that.report(e);
            }
        });
        source_conn.finishedWithConnection();
        if (IO.File.exists("overlays/post_upgrade.sql")) {
            SQL.Connection.execMySQLFile("overlays/post_upgrade.sql");
        }
    });
});


module.exports.define("printSchemaDifferences", function (source_db) {
    var normal_db = SQL.Connection.database;
    this.info("printSchemaDifferences()");
    this.database = source_db;
    Data.entities.each(function (entity) {
        entity.printDifferences(entity.getComparator());
    });
    this.database = normal_db;
});


module.exports.define("launch", function (session, user_type, spec) {
    var trans;
    var query;
    var count = 0;
    var row;

    this.info("launch(): on user_type: " + user_type);
    trans = session.getNewTrans();
    query = Data.entities.get("ac_user").getQuery();
    query.addCondition({
        column: "A.user_type",
        operator: "=",
        value: user_type,
    });
    query.addCondition({
        column: "A.status",
        operator: "=",
        value: "L",
    });           // locked
    query.addCondition({
        column: "A.unlock_code",
        operator: "NU",
        value: "",
    });            // unlock code not set
    if (spec.condition) {
        query.addCondition({ full_condition: spec.condition, });
    }
    if (typeof spec.limit !== "number") {
        spec.limit = 10;
    }
    while (query.next()) {
        count += 1;
        if (count > spec.limit) {
            break;
        }
        row = query.getRow(trans);
//        row = trans.getActiveRow("ac_user", query.getColumn("A._key").get());

        this.info("Calling setupUnlock() on: [" + row.getKey() + "] " + row.getLabel("page_title_addl"));
        row.setupUnlock(spec);
    }
    query.reset();
    if (count > 0) {
        trans.save();
    } else {
        trans.cancel();
    }
});

