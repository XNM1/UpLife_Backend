const logger = require("logger");

module.exports = {
    name_validate(req, res, next) {
        const name = JSON.parse(req.query.filter).name;
        if(name != undefined && name.length === 0) {
            req.errors.push("editing filter failed: name should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: incorrect name");
        }
        next();
    },

    async uid_check(req, res, next) {
        const uid = JSON.parse(req.query.filter).uid;
        const query = `query all($uid: int) {
            all(func: uid($uid)) {
                name
            }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
        if (resp.getJson().all.length === 0) {
            req.errors.push("editing filter failed: filter doesn`t exist");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: filter doesn`t exist");
        }
        next();
    },

    async author_check(req, res, next) {
        const uid = JSON.parse(req.query.filter).uid;
        const query = `query all($uid: int) {
            all(func: uid($uid)) {
                name
                author
            }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
        if (resp.getJson().all[0].author != req.user.uid) {
            req.errors.push("editing filter failed: you don`t have permission to this filter");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: user don`t have permission to this filter");
        }
        next();
    },

    query_validate(req, res, next) {
        if (req.query.filter === undefined) {
            res.send("editing filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        const filter = JSON.parse(req.query.filter);
        const props = { name: 0, tags: 0 };
        var incr_props = 0;
        if (Object.keys(filter).length > Object.keys(props).length) {
            res.send("editing filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        for (const p in filter) {
            if (p !== "name" && p !== "tags") incr_props++;
        }
        if (incr_props !== 0) {
            res.send("editing filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        next();
    }
}