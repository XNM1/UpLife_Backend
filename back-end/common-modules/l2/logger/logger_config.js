/** //TODO: rewrite documentation
 * Конфигурация логгера
 * @level trace - уровень, исользуется для записи системаной информации
 * @level debug - уровень, используется для записи детальной информации
 * @level info - уровень, используется для записи основной информации
 * @level warn - уровень, используется для записи предупреждений
 * @level error - уровень, используется для записи ошибок
 * @level fatal - уровень, используется для записи сбоев
 *
 * appenders - объекты вывода: _{name} - объекты вывода; {name} - отфильтрованые объекты вывода, они используются в categories
 * @var debug_f - отфильтрований по уровням файл для дебагинга, туда записывается логи урованя [ trace, debug, info, warn, error, fatal ]
 * @var stdout - вывод в консоль, не фильтруется
 * @var full_info_f - отфильтрований по уровням файл для записи полной информации, туда записывается логи урованя [ debug, info, warn, error, fatal ]
 * @var info_f - отфильтрований по уровням файл для записи основной информации, туда записывается логи урованя [ info, warn, error, fatal ]
 * @var warn_f - отфильтрований по уровням файл для записи предупреждений, туда записывается логи урованя [ warn ]
 * @var error_f - отфильтрований по уровням файл для записи ошибок, туда записывается логи урованя [ error, fatal ]
 * @var error_slack - отфильтрований по уровням вывод в slack для записи ошибок, туда записывается логи урованя [ error, fatal ]
 *
 * categories - режимы работы логгера
 * @mode error - режим, при котором логгер пишет ошибки в error_f, error_slack
 * @mode error_full - режим, при котором логгер пишет ошибки в error_f, error_slack, stdout
 * @mode error_scrn - режим, при котором логгер пишет ошибки в stdout
 * //
 * @mode warn_err - режим, при котором логгер пишет предупреждения и ошибки в error_f, error_slack, warn_f
 * @mode warn_err_full - режим, при котором логгер пишет предупреждения и ошибки в error_f, error_slack, warn_f, stdout
 * @mode warn_err_scrn - режим, при котором логгер пишет предупреждения и ошибки в stdout
 * //
 * @mode default(production) - режим, при котором логгер пишет основную информацию в error_f, error_slack, warn_f, info_f
 * @mode default_full(production_full) - режим, при котором логгер пишет основную информацию в error_f, error_slack, warn_f, info_f, stdout
 * @mode default_scrn(production_scrn) - режим, при котором логгер пишет основную информацию в stdout
 * //
 * @mode full_info - режим, при котором логгер пишет детальную информацию в error_f, error_slack, warn_f, info_f, full_info_f
 * @mode full_info_full - режим, при котором логгер пишет детальную информацию в error_f, error_slack, warn_f, info_f, full_info_f, stdout
 * @mode full_info_scrn - режим, при котором логгер пишет детальную информацию в stdout
 * //
 * @mode debug - режим, при котором логгер пишет всю информацию в error_f, debug_f, warn_f, info_f, full_info_f
 * @mode debug_full - режим, при котором логгер пишет всю информацию в error_f и error_f, debug_f, warn_f, info_f, full_info_f, stdout
 * @mode debug_scrn - режим, при котором логгер пишет всю информацию в stdout
 * //
 * @mode off - режим, отключает логгирование
 *
 * @author IAmIllusion
 * @version 1.0.1
 */
var moment = require('moment');
const date = new Date();
const date_str = moment().format().replace(/\:/g,'-');
const logger_config = {
    appenders: {
        _debug_f: { type: 'file', filename: 'logs/' + process.env.NAME + '/log - ' + date_str + '/debug.log' },
        _full_info_f: { type: 'file', filename: 'logs/' + process.env.NAME + '/log - ' + date_str + '/fullinfo.log' },
        _info_f: { type: 'file', filename: 'logs/' + process.env.NAME + '/log - ' + date_str + '/info.log' },
        _warn_f: { type: 'file', filename: 'logs/' + process.env.NAME + '/log - ' + date_str + '/warn.log' },
        _error_f: { type: 'file', filename: 'logs/' + process.env.NAME + '/log - ' + date_str + '/error.log' },
        _error_slack: {
            type: '@log4js-node/slack',
            token: 'xoxp-703298589781-705138965015-703365258293-3dec199d58b3507d893e4c181212527b',
            channel_id: 'logger_error_',
            username: 'project'
        },
        _warn_slack: {
            type: '@log4js-node/slack',
            token: 'xoxp-703298589781-705138965015-703365258293-3dec199d58b3507d893e4c181212527b',
            channel_id: 'logger_warn_',
            username: 'project'
        },
        _info_slack: {
            type: '@log4js-node/slack',
            token: 'xoxp-703298589781-705138965015-703365258293-3dec199d58b3507d893e4c181212527b',
            channel_id: 'logger_info_',
            username: 'project'
        },

        stdout: { type: 'stdout' },
        debug_f: { type: 'logLevelFilter', appender: '_debug_f', level: 'all' },
        full_info_f: { type: 'logLevelFilter', appender: '_full_info_f', level: 'debug' },
        info_f: { type: 'logLevelFilter', appender: '_info_f', level: 'info' },
        warn_f: { type: 'logLevelFilter', appender: '_warn_f', level: 'warn', maxLevel: 'warn' },
        error_f: { type: 'logLevelFilter', appender: '_error_f', level: 'error' },
        error_slack: { type: 'logLevelFilter', appender: '_error_slack', level: 'error' },
    },
    categories: {
            error: { appenders: ['error_f', 'error_slack'], level: 'error'},
            error_full: { appenders: ['error_f', 'error_slack', 'stdout'], level: 'error'},
            error_scrn: { appenders: ['stdout'], level: 'error'},

            warn_err: { appenders: ['error_f', 'error_slack', 'warn_f'], level: 'warn'},
            warn_err_full: { appenders: ['error_f', 'error_slack', 'warn_f', 'stdout'], level: 'warn'},
            warn_err_scrn: { appenders: ['stdout'], level: 'warn'},

            default: { appenders: ['error_f', 'info_f', 'warn_f', 'error_slack'], level: 'info'},
            default_full: { appenders: ['error_f', 'info_f', 'warn_f', 'error_slack', 'stdout'], level: 'info'},
            default_scrn: { appenders: ['stdout'], level: 'info'},

            full_info: { appenders: ['error_f', 'info_f', 'warn_f', 'error_slack', 'full_info_f'], level: 'debug'},
            full_info_full: { appenders: ['error_f', 'info_f', 'warn_f', 'error_slack', 'full_info_f', 'stdout'], level: 'debug'},
            full_info_scrn: { appenders: ['stdout'], level: 'debug'},

            debug: { appenders: ['error_f', 'info_f', 'warn_f', 'full_info_f', 'debug_f'], level: 'all'},
            debug_full: { appenders: ['error_f', 'info_f', 'warn_f', 'full_info_f', 'debug_f', 'stdout'], level: 'all'},
            debug_scrn: { appenders: ['stdout'], level: 'all'},

            off: { appenders: ['error_f', 'info_f', 'warn_f', 'error_slack', 'full_info_f', 'debug_f', 'stdout'], level: 'off'}
        }
};

module.exports = logger_config;