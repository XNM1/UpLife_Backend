const app = require("express")();
const cluster = require("cluster");
const passport = require("app-passport").passport;
const express_session = require("app-passport").express_session;
const config = require("common-modules").config;
const logger = require("logger");
const formidable = require('formidable');
const fs = require('fs');
const dgraph_instance = require("dgraph-instance");
const faker = require('faker');
const numCPUs = require('os').cpus().length;
const upload_patterns = require("upload-patterns");

if (cluster.isMaster) {
  // Master code
  logger.info("[" + process.env.NAME + "] server started on " + config.get("services.upload.port") + " port");

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

  app.post("/avatar", author, function(req, res) {
    upload_patterns.upload_user_data(req, res, "avatar");
  });

  app.post("/backimage", author, function(req, res) {
    upload_patterns.upload_user_data(req, res, "backimage");
  });

  app.post("/filter/backimage", author, function(req, res) {
    try {
      const uid = req.query.uid;
      upload_patterns.upload_misc_backimage(req, res, "filters", uid);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOAD][FAIL][BACKIMAGE][FILTER] error: " + error);
      res.send("Cannot upload backimage for filter");
    }
  });

  app.post("/chat/backimage", author, function(req, res) {
    try {
      const uid = req.query.uid;
      upload_patterns.upload_misc_backimage(req, res, "chats", uid);
    }
    catch(error) {
      logger.error("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "][UPLOAD][FAIL][BACKIMAGE][CHAT] error: " + error);
      res.send("Cannot upload backimage for chat");
    }
  });

  app.listen(config.get("services.upload.port"));
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");
}