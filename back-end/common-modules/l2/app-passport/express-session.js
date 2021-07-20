const session = require("express-session");
const config = require("common-modules").config;
const redisStore = require("./redis-store");
module.exports = session({
  key: config.get("passport_config.session_name"),
  store: redisStore,
  secret: config.get("passport_config.secret"),
  resave: false,
  saveUninitialized: false
});
