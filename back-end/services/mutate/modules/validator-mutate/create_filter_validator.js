const logger = require("logger");

module.exports = {
    name_validate(req, res, next) {
        const name = JSON.parse(req.query.filter).name;
        if(name.length === 0) {
            req.errors.push("creating filter failed: name should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][FILTER] ip: " + req.ip + ", error: incorrect name");
        }
        next();
    },

    query_validate(req, res, next) {
        if (req.query.filter === undefined) {
            res.send("creating filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        const filter = JSON.parse(req.query.filter);
        const props = { name: 0, tags: 0, author: 0 };
        var incr_props = 0;
        if (Object.keys(filter).length > Object.keys(props).length) {
            res.send("creating filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        for (const p in filter) {
            if (p !== "name" && p !== "tags" && p !== "author") incr_props++;
            if (p === "tags") props.members++;
            if (p === "author") props.author++;
        }
        if (incr_props !== 0 || props.tags === 0 || props.author === 0) {
            res.send("creating filter failed: incorrect filter");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][FILTER] ip: " + req.ip + ", error: incorrect filter");
        }
        next();
    }
}