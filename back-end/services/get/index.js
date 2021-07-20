const app = require("express")();
const cluster = require("cluster");
const passport = require("app-passport").passport;
const express_session = require("app-passport").express_session;
const config = require("common-modules").config;
const logger = require("logger");
const dgraph_instance = require("dgraph-instance");
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Master code
  logger.info("[" + process.env.NAME + "] server started on " + config.get("services.get.port") + " port");

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
    logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][WITHOUT PERMISSION] ip: " + req.ip + ", params: " + JSON.stringify(req.query) + ", body: " + JSON.stringify(req.body));
  });

  app.post("/", author, function(req, res) {
    res.send(req.user);
    logger.debug("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][AUTHORIZATION][SUCCESS] USER: id: " + req.user.uid + ", username: " + req.user.username);
  });

  app.listen(config.get("services.get.port"));
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");
}