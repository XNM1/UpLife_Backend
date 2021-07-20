const passport_socket_io = require("passport.socketio");
const cookie_parser = require("cookie-parser");
const redisStore = require("./redis-store");
const passport = require("./passport");
const config = require('common-modules').config;
module.exports.passport_socket_io = passport_socket_io.authorize({
  cookieParser: cookie_parser, // the same middleware you registrer in express
  key: config.get('passport_config.session_name'), // the name of the cookie where express/connect stores its session_id
  secret: config.get('passport_config.secret'), // the session_secret to parse the cookie
  store: redisStore, // we NEED to use a sessionstore. no memorystore please
  passport: passport,
  success: onAuthorizeSuccess, // *optional* callback on success - read more below
  fail: onAuthorizeFail // *optional* callback on fail/error - read more below
});

module.exports.sockets = passport_socket_io;

function onAuthorizeSuccess(data, accept) {
  console.log("successful connection to socket.io");
  accept();
}

function onAuthorizeFail(data, message, error, accept) {
  console.log("failed connection to socket.io:", message);
  if (error) accept(new Error(message));
}