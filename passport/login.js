/**
 * @file login.js
 * @brief login js
 * @author conansherry
 * @version 1.3
 * @date 2015-10-06
 */

var crypto = require('crypto');
var log4js = require("log4js");
var logger = log4js.getLogger("login.js");

var rabbitStorage;

exports.setRabbitStorageInstance = function(storage) {
    rabbitStorage = storage;
};

/**
 * -1 : no user; 0 : pwd error; 1 : valid;
 **/
var ensureLogin = function(uid, pwd, callback) {
    rabbitStorage.verifyUser(uid, function(err, res) {
        logger.debug(res);
        if(err) {
            logger.info("NO_USER uid=" + uid);
            callback(null, -1);
        }
        else {
            var sha1 = crypto.createHash('sha1');
            sha1.update(pwd);
            if(res.pwd == sha1.digest('hex')) {
                logger.info("VALID uid=" + uid);
                callback(null, 1);
            }
            else {
                logger.info("PWD_ERROR uid=" + uid);
                callback(null, 0);
            }
        }
    });
};
exports.ensureLogin = ensureLogin;

exports.login = function(req, rootRes) {
    var userinfo = {
        uid : req.body.uid,
        pwd : req.body.pwd,
    };
    ensureLogin(userinfo.uid, userinfo.pwd, function(err, res) {
        if(err) {
            rootRes.send("ERROR");
        }
        else if(res == -1) {
            rootRes.send("NO_USER");
        }
        else if(res == 0) {
            rootRes.send("PWD_ERROR");
        }
        else {
            rootRes.send("VALID");
        }
    });
};
