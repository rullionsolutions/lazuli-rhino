/* global x */

"use strict";

// Shim to be used in main.js
// * AFTER loading the R6 ac module

x.entities.ac_tx.getField("id").auto_generate = true;
x.entities.ac_session.getField("id").auto_generate = true;
x.entities.ac_wf_inst_node.batchPoke.start_inside_tomcat = false;

x.entities.ac_email.data_volume_oom = 5;
x.entities.ac_export.data_volume_oom = 5;
x.entities.ac_file.data_volume_oom = 5;
x.entities.ac_import.data_volume_oom = 5;
x.entities.ac_session.data_volume_oom = 5;
x.entities.ac_tx.data_volume_oom = 5;
x.entities.ac_user.data_volume_oom = 3;
x.entities.ac_user_deleg.data_volume_oom = 3;
x.entities.ac_user_role.data_volume_oom = 3;
x.entities.ac_visit.data_volume_oom = 5;
x.entities.ac_wf_inst.data_volume_oom = 4;
