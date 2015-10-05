/**
 * @file register.js
 * @brief user register
 * @author conansherry
 * @version 1.3
 * @date 2015-10-05
 */

var crypto = require('crypto');
var log4js = require("log4js");
var logger = log4js.getLogger("register.js");

var rabbitStorage;

exports.setRabbitStorageInstance = function(storage) {
    rabbitStorage = storage;
};

exports.register = function(req, rootRes) {
    var userinfo = {
        uid : req.body.uid,
        pwd : req.body.pwd,
        email : req.body.email,
        name : req.body.name,
        country : req.body.country,
        province : req.body.province,
        city : req.body.city,
        sex : req.body.sex,
        age : req.body.age,
        phone : req.body.phone,
        score : req.body.score,
        title : req.body.title,
        brief : req.body.brief
    };
    rabbitStorage.getUser(userinfo.uid, function(err, res) {
        if(err) {
            var sha1 = crypto.createHash('sha1');
            sha1.update(userinfo.pwd);
            userinfo.pwd = sha1.digest('hex');
            logger.info(userinfo.uid + " " + userinfo.pwd);
            rabbitStorage.addUser(userinfo, function(err, res) {
                if(err == null) {
                    logger.info("register successfully");
                    rootRes.send("register successfully");
                }
            });
        }
        else {
            logger.info("user is exists");
            rootRes.send("user is exists");
        }
    });
};
