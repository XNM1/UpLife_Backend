const upload_patterns_user = require('./upload-patterns-user');
const upload_patterns_misc = require('./upload-patterns-misc');

module.exports = {
    upload_user_data: upload_patterns_user.upload_user_data,
    upload_misc_backimage: upload_patterns_misc.upload_misc_backimage
}