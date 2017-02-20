/* global x, Packages */

"use strict";

// Shim to be used in main.js
// * AFTER loading the R6 sy module


x.entities.sy_runtime.getField("id").auto_generate = true;
x.entities.sy_runtime.reassign("start", function () {
    if (!x.sql.Connection.database_exists) {
        return;
    }
    try {
        x.app.runtime_row = this.cloneAutoIncrement({
            monitor: 0,
        }, {
            app_id: x.app.app_id,
            start_dttm: "now",
            server_ident: x.app.server_ident,
            saph_version: (x.base.version || " - ") + "." + (x.base.patch || " - "),
            emerald_patch: x.app.emerald_patch || "",
            emerald_hash: String(this.getCommitHash(x.app.emerald_dir) || ""),
            sapphire_hash: String(this.getCommitHash(x.app.sapphire_dir) || ""),
            memory_max: x.core.Format.round(Packages.java.lang.Runtime.getRuntime().maxMemory()
                / 1000000),
        });
        x.app.runtime_id = x.app.runtime_row.getKey();
    } catch (e) {
        this.report(e);
    }
});


x.entities.sy_number.data_volume_oom = 5;
x.entities.sy_list.data_volume_oom = 2;
x.entities.sy_list_item.data_volume_oom = 3;
x.entities.sy_migration.data_volume_oom = 2;
x.entities.sy_monitor.data_volume_oom = 4;
x.entities.sy_user_type.data_volume_oom = 1;
