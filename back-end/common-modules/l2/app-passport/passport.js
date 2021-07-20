const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const dgraph_instance = require("dgraph-instance");
const logger = require("logger");
const config = require("common-modules").config;

passport.use(
  new LocalStrategy(async function(username, password, done) {
    try {
      const query = `query all($username: string, $password: string) {
        all(func: eq(username, $username)) {
          checkpwd(password, $password),
          uid,
          username
        }
      }`;
      const resp = await dgraph_instance.dgraph_connection.query(query, { $username: username, $password: password });
      if (resp.getJson().all.length === 0) {
        return done(null, false);
      }
      const user = resp.getJson().all[0];
      if (!user["checkpwd(password)"]) {
        return done(null, false);
      }
      return done(null, user);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][SIGN IN][FAIL] error: " + error);
      return done(null, false);
    }
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.uid);
});

passport.deserializeUser(async function(id, done) {
  try {
    var query = `query all($uid: string) {
      all(func: uid($uid)) {\n`
    for(let row of config.get("dgraph_db_config.user_scheme_auth")) {
      query += row + ',\n';
    }
    query +=`}
            }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: id });
    if (resp.getJson().all.length === 0) {
      done(null, false);
    }
    const user = resp.getJson().all[0];
    done(null, user);
  }
  catch (error) {
    logger.error("[" + process.env.NAME + "][SIGN IN][SESSION][FAIL] error: " + error);
    done(null, false);
  }
});

module.exports = passport;
