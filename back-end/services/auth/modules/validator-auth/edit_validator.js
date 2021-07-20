const validator = require('validator');
const dgraph_instance = require("dgraph-instance");
const logger = require("logger");

module.exports = {
    async username_check(req, res, next) {
        const username = JSON.parse(req.query.user).username;
        if (username !== undefined) {
            const query = `query all($username: string) {
                all(func: eq(username, $username)) {
                    uid,
                    username
                }
            }`;
            const resp = await dgraph_instance.dgraph_connection.query(query, { $username: username });
            if (resp.getJson().all.length !== 0 && resp.getJson().all[0].username !== req.user.username) {
                req.errors.push("edit failed: username was already taken");
                logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: username was already taken");
            }
        }
        next();
    },

    async email_check(req, res, next) {
        const email = JSON.parse(req.query.user).email;
        if (email !== undefined) {
            const query = `query all($email: string) {
                all(func: eq(email, $email)) {
                    uid,
                    email
                }
            }`;
            const resp = await dgraph_instance.dgraph_connection.query(query, { $email: email });
            if (resp.getJson().all.length !== 0 && resp.getJson().all[0].email !== req.user.email) {
                req.errors.push("edit failed: email was already taken");
                logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: email was already taken");
            }
        }
        next();
    },

    username_validate(req, res, next) {
        const username = JSON.parse(req.query.user).username;
        if(username != undefined && username.length === 0) {
            req.errors.push("edit failed: username should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect username");
        }
        next();
    },

    full_name_validate(req, res, next) {
        const full_name = JSON.parse(req.query.user).full_name;
        if(full_name !== undefined && full_name.length === 0) {
            req.errors.push("edit failed: full_name should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect full name");
        }
        next();
    },

    email_validate(req, res, next) {
        const email = JSON.parse(req.query.user).email;
        if(email !== undefined && !validator.isEmail(email)) {
            req.errors.push("edit failed: incorrect email address");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect email");
        }
        next();
    },

    password_validate(req, res, next) {
        const password = JSON.parse(req.query.user).password;
        if(password !== undefined && password.length < 7) {
            req.errors.push("edit failed: password should be at least 7 characters");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect password");
        }
        next();
    },

    query_validate(req, res, next) {
        if (req.query.user === undefined) {
            res.send("edit failed: incorrect user");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect user");
        }
        const user = JSON.parse(req.query.user);
        const props = { username: 0, full_name: 0, email: 0, password: 0 };
        var incr_props = 0;
        if (Object.keys(user).length > Object.keys(props).length) {
            res.send("edit failed: incorrect user");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect user");
        }
        for (const p in user) {
            if (p !== "username" && p !== "full_name" && p !== "email" && p !== "password") incr_props++;
        }
        if (incr_props !== 0) {
            res.send("edit failed: incorrect user");
            logger.debug("[" + process.env.NAME + "][EDIT][FAIL] ip: " + req.ip + ", error: incorrect user");
        }
        next();
    }
}