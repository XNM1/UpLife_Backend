const create_chat_validator = require('./create_chat_validator');
const edit_chat_validator = require('./edit_chat_validator');
const create_filter_validator = require('./create_filter_validator');
const edit_filter_validator = require('./edit_filter_validator');

function init(req, res, next) {
    req.errors = [];
    next();
}

function finalize(req, res, next) {
    if (req.errors.length > 0) {
        res.send(JSON.stringify(req.errors));
    }
    else {
        next();
    }
}

module.exports = {
    create_chat: [create_chat_validator.query_validate, init, create_chat_validator.name_validate, finalize],
    edit_chat: [edit_chat_validator.query_validate, init, edit_chat_validator.uid_check, edit_chat_validator.member_check, edit_chat_validator.name_validate, finalize],
    delete_chat: [init, edit_chat_validator.uid_check, edit_chat_validator.member_check, finalize],
    create_filter: [create_filter_validator.query_validate, init, create_filter_validator.name_validate, finalize],
    edit_filter: [edit_filter_validator.query_validate, init, edit_filter_validator.uid_check, edit_filter_validator.author_check, edit_filter_validator.name_validate, finalize],
    delete_filter: [init, edit_filter_validator.uid_check, edit_filter_validator.author_check, finalize]
}