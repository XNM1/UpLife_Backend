const logger = require("logger");

module.exports = {
    username_validate(req, res, next) {
        const username = req.query.username;
        if(username.length === 0) {
            req.errors.push("sign in failed: username should be at least 1 characters");
            logger.debug("[" + process.env.NAME + "][SIGN IN][FAIL] ip: " + req.ip + ", error: incorrect username");
        }
        next();
    },

    password_validate(req, res, next) {
        const password = req.query.password;
        if(password.length < 7) {
            req.errors.push("sign in failed: password should be at least 7 characters");
            logger.debug("[" + process.env.NAME + "][SIGN IN][FAIL] ip: " + req.ip + ", error: incorrect password");
        }
        next();
    }
}