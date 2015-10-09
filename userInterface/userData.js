/**
 * @file userData.js
 * @brief modify pwd or modify info and so on.
 * @author conansherry
 * @version 1.3
 * @date 2015-10-08
 */

var crypto = require('crypto');
var log4js = require("log4js");
var logger = log4js.getLogger("userData.js");

var config = require("config");
var storage = require("../storage/rabbitStorage.js");
var storageConf = config.get("storage");
var rabbitStorage = storage.createRabbitStorage(storageConf);

exports.updateInfo = function(req, rootRes) {
    var userinfo = {
        name : req.body.name,
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
    rabbitStorage.updateInfo(userinfo, function(err, res) {
        if(err) {
            logger.debug("update Info failed");
            rootRes.send("FAILED");
        }
        else {
            logger.debug("update Info Successfully. name=" + userinfo.name);
            rootRes.send("OK");
        }
    });
};
