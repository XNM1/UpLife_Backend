const app = require("express")();
const cluster = require("cluster");
const passport = require("app-passport").passport;
const express_session = require("app-passport").express_session;
const config = require("common-modules").config;
const logger = require("logger");
const dgraph_instance = require("dgraph-instance");
const validator = require('validator-auth');
const bent = require('bent');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Master code
  logger.info("[" + process.env.NAME + "] server started on " + config.get("services.auth.port") + " port");

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.fatal("[" + process.env.NAME + `][WORKER ${worker.process.pid}] died`);
    cluster.fork();
  });
} else {
  // Worker code
  const delete_mutate = bent('http://mutate-nginx:87/', 'DELETE', 'string', 200);

  app.use(express_session);
  app.use(passport.initialize());
  app.use(passport.session());

  const author = (req, res, next) => {
    if (req.isAuthenticated()) {
      next();
    } else {
      res.redirect("/fail");
    }
  };

  const not_author = (req, res, next) => {
    if (!req.isAuthenticated()) {
      next();
    } else {
      res.redirect("/fail");
    }
  };

  const local_authen = passport.authenticate("local", {
    failureRedirect: "/signin/fail"
  });

  validator.signin_local.push(local_authen);
  app.post(
    "/signup",
    validator.signup,
    async function(req, res) {
    try {
      const user = JSON.parse(req.query.user);
      user.uid = "_:" + user.username;
      const resp = await dgraph_instance.dgraph_connection.mutate(user);
      res.send("sign up ok");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][SIGN UP][SUCCESS][USER]: id: ${resp.getUidsMap().get(user.username)}` + ", username: " + user.username);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN UP][FAIL][USER] error: " + error);
      res.redirect("/signup/fail");
    }
  });

  validator.edit.unshift(author);
  app.put(
    "/edit",
    validator.edit,
    async function(req, res) {
    try {
      const user = JSON.parse(req.query.user);
      user.uid = req.user.uid;
      const resp = await dgraph_instance.dgraph_connection.mutate(user);
      res.send("edited ok");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][EDIT][SUCCESS][USER]: id: ${req.user.uid}` + ", username: " + user.username);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][EDIT][FAIL][USER] error: " + error);
      res.redirect("/signup/fail");
    }
  });

  app.delete(
    "/delete",
    author,
    async function(req, res) {
      try {
        var presonal_chats = await personal_chat_get(req.user.uid);
        var presonal_filters = await personal_filter_get(req.user.uid);
        var presonal_contacts = await personal_contact_get(req.user.uid);
        var connections_chats = await connection_chat_get(req.user.uid)
        if (presonal_chats !== null) {
          await personal_chat_delete(presonal_chats);
        }
        if (connections_chats !== null) {
          await connection_chat_delete(connections_chats, req.user.uid);
        }
        await dgraph_instance.dgraph_connection.delete({uid:req.user.uid, full_name: null, username: null, status: null, email: null, avatar: null, backimage: null, password: null, contacts: null, filters: null});
        await dgraph_instance.dgraph_connection.delete({uid:req.user.uid});
        if (presonal_filters !== null) {
          await personal_filter_delete(presonal_filters);
        }
        if (presonal_contacts !== null) {
          await personal_contact_delete(presonal_contacts, req.user.uid);
        }
        req.logout();
        res.send("Your account was succesfully deleted");
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + `][DELETE][SUCCESS][USER] id: ${req.user.uid}`);
      }
      catch(error) {
        logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DELETE][FAIL][USER] error: " + error);
        res.send("Your account wasn`t deleted");
      }
  });

  app.post(
    "/signin/local",
    validator.signin_local,
    function(req, res) {
      res.send("sign in ok");
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN IN][SUCCESS][USER]: id: " + req.user.uid + ", username: " + req.user.username);
    }
  );

  app.post("/signout", author, function(req, res) {
    try {
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN OUT][SUCCESS][USER]: id: " + req.user.uid + ", username: " + req.user.username);
      req.logout();
      res.send("sign out ok");
    } catch (error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN OUT][FAIL][USER] error: " + error);
      res.redirect("/signout/fail");
    }
  });

  app.get("/", author, async function(req, res) {
    res.send(req.user);
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][AUTHORIZATION][SUCCESS][USER]: id: " + req.user.uid + ", username: " + req.user.username);
  });

  app.get("/signin/fail", function(req, res) {
    res.send("sign in failed");
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN IN][FAIL] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });
  app.get("/signup/fail", function(req, res) {
    res.send("sign up failed");
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN UP][FAIL] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });
  app.get("/signout/fail", function(req, res) {
    res.send("sign out failed");
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][SIGN OUT][FAIL] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });
  app.get("/fail", function(req, res) {
    res.send("access denied");
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][WITHOUT PERMISSION] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });

  async function personal_chat_get(user_uid) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~members @filter(eq(count(members), 1)) {
          uid,
          tasks {
            uid
          }
  			}
      }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: user_uid });
    if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined) {
      return resp.getJson().all[0]["~members"];
    }
    else {
      return null;
    }
  }
  async function personal_chat_delete(chats) {
    for(const c of chats) {
      await delete_mutate('chat?uid='+c.uid);
    }
  }

  async function connection_chat_get(user_uid) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~members {
          uid
  			}
      }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: user_uid });
    if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined) {
      return resp.getJson().all[0]["~members"];
    }
    else {
      return null;
    }
  }
  async function connection_chat_delete(chats, user_uid) {
    for(const c of chats) {
      await dgraph_instance.dgraph_connection.delete({ uid: c.uid, members: { uid: user_uid } });
    }
  }

  async function personal_filter_get(user_uid) {
    const query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~author @filter(has(backimage)) {
          uid,
          name
        }
      }
    }`;
    const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: user_uid });
    if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined) {
      return resp.getJson().all[0]["~author"];
    }
    else {
      return null;
    }
  }
  async function personal_filter_delete(filters) {
    for(const f of filters) {
      await delete_mutate('filter?uid='+f.uid);
    }
  }

  async function personal_contact_get(user_uid) {
    query = `query all($uid: int) {
      all(func: uid($uid)) {
        ~contacts {
          uid
        }
      }
    }`;
    resp = await dgraph_instance.dgraph_connection.query(query, { $uid: user_uid });
    if (resp.getJson().all[0] !== null && resp.getJson().all[0] !== undefined) {
      return resp.getJson().all[0]["~contacts"];
    }
    else {
      return null;
    }
  }
  async function personal_contact_delete(contacts, user_uid) {
    for(const c of contacts) {
      await dgraph_instance.dgraph_connection.delete({ uid: c.uid, contacts: { uid: user_uid } });
    }
  }

  app.listen(config.get("services.auth.port"));
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");
}