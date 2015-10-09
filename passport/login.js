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

var config = require("config");
var storage = require("../storage/rabbitStorage.js");
var storageConf = config.get("storage");
var rabbitStorage = storage.createRabbitStorage(storageConf);

/**
 * 1 : no user; 2 : pwd error; 0 : valid;
 **/
var ensureLogin = function(name, pwd, callback) {
    rabbitStorage.verifyUser(name, function(err, res) {
        logger.debug(res);
        if(err) {
            logger.info("NO_USER name=" + name);
            callback(null, 1);
        }
        else {
            var sha1 = crypto.createHash('sha1');
            sha1.update(pwd);
            if(res.pwd == sha1.digest('hex')) {
                logger.info("VALID name=" + name);
                callback(null, 0);
            }
            else {
                logger.info("PWD_ERROR name=" + name);
                callback(null, 2);
            }
        }
    });
};
exports.ensureLogin = ensureLogin;

exports.login = function(req, rootRes) {
    var userinfo = {
        name : req.body.name,
        pwd : req.body.pwd,
    };
    ensureLogin(userinfo.name, userinfo.pwd, function(err, res) {
        if(err) {
            rootRes.send("ERROR");
        }
        else if(res == 1) {
            rootRes.send("NO_USER");
        }
        else if(res == 2) {
            rootRes.send("PWD_ERROR");
        }
        else {
            rootRes.send("VALID");
        }
    });
};
