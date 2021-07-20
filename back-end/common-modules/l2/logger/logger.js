let logger_config = require('./logger_config');
let log4js = require('log4js');
let config = require('common-modules').config;

log4js.configure(logger_config);
module.exports = log4js.getLogger(config.get("logger_mode"));