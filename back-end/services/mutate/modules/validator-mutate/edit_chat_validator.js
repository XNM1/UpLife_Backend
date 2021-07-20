const dgraph_instance = require("dgraph-instance");
const logger = require("logger");

module.exports = {
    name_validate(req, res, next) {
        const name = JSON.parse(req.query.chat).name;
        if(name != undefined && name.length === 0) {
            req.errors.push("editing chat failed: name should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: incorrect name");
        }
        next();
    },

    async uid_check(req, res, next) {
        const uid = JSON.parse(req.query.chat).uid;
        const query = `query all($uid: int) {
            all(func: uid($uid)) {
                name
            }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
        if (resp.getJson().all.length === 0) {
            req.errors.push("editing chat failed: chat doesn`t exist");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: chat doesn`t exist");
        }
        next();
    },

    async member_check(req, res, next) {
        const uid = JSON.parse(req.query.chat).uid;
        const query = `query all($uid: int) {
            all(func: uid($uid)) {
                name
                members
            }
        }`;
        const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
        var member_exsist = false;
        for(const m of resp.getJson().all[0].members) {
            if(m == req.user.uid) {
                member_exsist = true;
                break;
            }
        }
        if (!member_exsist) {
            req.errors.push("editing chat failed: you don`t have permission to this chat");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: user don`t have permission to this chat");
        }
        next();
    },

    query_validate(req, res, next) {
        if (req.query.chat === undefined) {
            res.send("editing chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        const chat = JSON.parse(req.query.chat);
        const props = { name: 0, members: 0, tags: 0 };
        var incr_props = 0;
        if (Object.keys(chat).length > Object.keys(props).length) {
            res.send("editing chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        for (const p in chat) {
            if (p !== "name" && p !== "members" && p !== "tags") incr_props++;
        }
        if (incr_props !== 0) {
            res.send("editing chat failed: incorrect chat");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL][CHAT] ip: " + req.ip + ", error: incorrect chat");
        }
        next();
    }
}