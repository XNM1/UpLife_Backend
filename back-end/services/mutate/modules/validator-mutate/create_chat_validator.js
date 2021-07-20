const logger = require("logger");

module.exports = {
    name_validate(req, res, next) {
        const name = JSON.parse(req.query.chat).name;
        if(name.length === 0) {
            req.errors.push("creating chat failed: name should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][CHAT] ip: " + req.ip + ", error: incorrect name");
        }
        next();
    },

    query_validate(req, res, next) {
        if (req.query.chat === undefined) {
            res.send("creating chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        const chat = JSON.parse(req.query.chat);
        const props = { name: 0, members: 0, tags: 0 };
        var incr_props = 0;
        if (Object.keys(chat).length > Object.keys(props).length) {
            res.send("creating chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        for (const p in chat) {
            if (p !== "name" && p !== "members" && p !== "tags") incr_props++;
            if (p === "members") props.members++;
        }
        if (incr_props !== 0 || props.members === 0) {
            res.send("creating chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][CREATE][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        next();
    }
}