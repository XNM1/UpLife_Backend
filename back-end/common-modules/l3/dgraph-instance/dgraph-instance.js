const config = require("common-modules").config;
const logger = require("logger");
const DgraphConnection = require("dgraph-db");

try {
    const hsts = config.get("dgraph_db_config.hosts");
    const dgaph_conn =  new DgraphConnection(hsts);
    var sch = "";
    for(let row of config.get("dgraph_db_config.scheme")) {
        sch += row + '\n';
    }
    dgaph_conn.set_schema(sch);
    module.exports = {
        hosts: hsts,
        dgraph_connection: dgaph_conn,
        scheme: sch
    }
}
catch (error) {
    logger.fatal("[" + process.env.NAME + "][DB CONNECTION] error: " + error);
}