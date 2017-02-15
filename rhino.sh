#!/bin/bash
SEP=$(java -h 2>&1 | grep "A [:;] separated" | sed -n 's/.*\([:;]\).*/\1/p')
java -classpath "WEB-INF/lib/rsl_local.jar${SEP}../../tomcat/endorsed/*${SEP}../../tomcat/lib/*" org.mozilla.javascript.tools.shell.Main -opt -1 -modules "../../../node_modules/" -modules ".." $*
