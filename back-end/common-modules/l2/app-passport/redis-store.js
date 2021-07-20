const Redis = require("ioredis");
const session = require("express-session");
const RedisStore = require("connect-redis-crypto")(session);
const config = require('common-modules').config;

const redisClient = new Redis.Cluster([config.get("db_session_config.redis.client_config")]);
module.exports = new RedisStore({
    client: redisClient,
    secret: config.get('db_session_config.redis.secret')
});