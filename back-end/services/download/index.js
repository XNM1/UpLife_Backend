const app = require("express")();
const cluster = require("cluster");
const passport = require("app-passport").passport;
const express_session = require("app-passport").express_session;
const config = require("common-modules").config;
const logger = require("logger");
const numCPUs = require('os').cpus().length;
const dgraph_instance = require("dgraph-instance");

if (cluster.isMaster) {
  // Master code
  logger.info("[" + process.env.NAME + "] server started on " + config.get("services.download.port") + " port");

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.fatal("[" + process.env.NAME + `][WORKER ${worker.process.pid}] died`);
    cluster.fork();
  });
} else {
  // Worker code
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

  app.get("/fail", function(req, res) {
    res.send("access denied");
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][WITHOUT PERMISSION] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });

  app.get("/avatar", author, function(req, res) {
    if (req.user.avatar !== undefined)
      res.sendFile(__dirname + '/data/users/'+req.user.uid+'/avatars/'+req.user.avatar);
    else {
      res.send('you don`t have any avatars');
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DOWNLOAD][AVATAR] error: we don`t have any avatars");
    }
  });

  app.get("/backimage", author, function(req, res) {
    if (req.user.backimage !== undefined)
      res.sendFile(__dirname + '/data/users/'+req.user.uid+'/backimages/'+req.user.backimage);
    else {
      res.send('you don`t have any backimages');
      logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DOWNLOAD][BACKIMAGE] error: we don`t have any backimages");
    }
  });

  app.get("/misc/backimage", author, async function(req, res) {
    try {
      const uid = req.query.uid;
      const misc_type = req.query.misc_type;
      const query = `query all($uid: int) {
        all(func: uid($uid)) {
            backimage
          }
        }`;
      const resp = await dgraph_instance.dgraph_connection.query(query, { $uid: uid });
      if (resp.getJson().all[0] !== undefined && resp.getJson().all[0].backimage !== undefined && resp.getJson().all[0].backimage !== "")
        res.sendFile(__dirname + '/data/'+misc_type+'s/'+uid+'/backimages/'+resp.getJson().all[0].backimage);
      else {
        res.send('you don`t have any backimages in this filter');
        logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DOWNLOAD][BACKIMAGE]["+misc_type.toUpperCase()+"] error: we don`t have any backimages in this filter");
      }
    }
    catch (error) {
      res.send('error download backimage');
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][DOWNLOAD][BACKIMAGE]["+misc_type.toUpperCase()+"][FAIL] download error: " + error);
    }
  });

  app.listen(config.get("services.download.port"));
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");
}