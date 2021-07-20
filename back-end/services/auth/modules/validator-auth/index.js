const signin_validator = require('./signin_validator');
const signup_validator = require('./signup_validator');
const edit_validator = require('./edit_validator');

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
    signup: [signup_validator.query_validate, init, signup_validator.username_validate, signup_validator.full_name_validate, signup_validator.password_validate, signup_validator.email_validate, signup_validator.username_check, signup_validator.email_check, finalize],
    signin_local: [init, signin_validator.username_validate, signin_validator.password_validate, finalize],
    edit: [edit_validator.query_validate, init, edit_validator.username_validate, edit_validator.full_name_validate, edit_validator.password_validate, edit_validator.email_validate, edit_validator.username_check, edit_validator.email_check, finalize]
}