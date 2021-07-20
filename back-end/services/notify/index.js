const app = require("express")();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const passport_io = require("app-passport").passport_socket_io;
const sockets = require("app-passport").sockets;
const redisAdapter = require("socket.io-redis");
const config = require("common-modules").config;
const cluster = require("cluster");
const sticky = require("sticky-session");
const logger = require("logger");
const Redis = require('ioredis');

if (!sticky.listen(server, config.get("services.notify.port"))) {
  // Master code
  server.once("listening", function() {
    logger.info(
      "[" + process.env.NAME + "] server started on " + config.get("services.notify.port") + " port"
    );
  });
  cluster.on("exit", (worker, code, signal) => {
    logger.fatal("[" + process.env.NAME + `][WORKER ${worker.process.pid}] died`);
  });
} else {
  // Worker code
  logger.info("[" + process.env.NAME + "][WORKER: " + cluster.worker.id + "] started");

  io.adapter(redisAdapter({
    pubClient: new Redis.Cluster([config.get("cache_config.redis.client_config")]),
    subClient: new Redis.Cluster([config.get("cache_config.redis.client_config")])
  }));
  io.use(passport_io);

  app.post("/chat/change", function(req, res) {
    try {
      const members = req.query.members;
      const type = req.query.type;
      const chat_uid = req.query.chat_uid;
      sockets.filterSocketsByUser(io, function(user) {
        return members.includes(user.uid) && user.logged_in === true;
      }).forEach(function(socket){
        socket.emit('chat change', { type:type, chat_uid:chat_uid });
      });
      res.send("notify ok");
    } catch (e) {
      res.send("error notify: error: " + e);
    }
  });

  app.post("/message/change", function(req, res) {
    try {
      const members = req.query.members;
      const type = req.query.type;
      const chat_uid = req.query.chat_uid;
      const message_uid = req.query.message_uid;
      const task_uid = req.query.task_uid;
      const state = req.query.state;
      sockets.filterSocketsByUser(io, function(user) {
        return members.includes(user.uid) && user.logged_in === true;
      }).forEach(function(socket){
        socket.emit('message change', { type:type, chat_uid:chat_uid, message_uid:message_uid, task_uid:task_uid, state:state });
      });
      res.send("notify ok");
    } catch (e) {
      res.send("error notify: error: " + e);
    }
  });

  app.post("/contact/change", function(req, res) {
    try {
      const contact_uid = req.query.contact_uid;
      const type = req.query.type;
      const user_uid = req.query.user_uid;
      sockets.filterSocketsByUser(io, function(user) {
        return user.uid == contact_uid && user.logged_in === true;
      }).forEach(function(socket){
        socket.emit('contact change', {type:type, user_uid:user_uid});
      });
      res.send("notify ok");
    } catch (e) {
      res.send("error notify: error: " + e);
    }
  });

  io.on("connection", function(socket) {
    logger.info(socket.request.user.username + " connected");
    socket.on("disconnect", function() {
      logger.info(socket.request.user.username + " disconnected");
    });
  });
}
