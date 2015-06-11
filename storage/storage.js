/**
 * @file storage.js
 * @brief combine redis&mysql
 * @author conansherry
 * @version 1.0
 * @date 2015-05-18
 */

var redisModule = require("./redisClient.js");
var mysqlModule = require("./mysqlClient.js");
var log4js = require("log4js")
var logger = log4js.getLogger("rabbitStorage.js");

function RabbitStorage() {
    this.redis = redisModule.createRabbitRedisClient();
    this.mysql = mysqlModule.createRabbitMysqlClient();
}

RabbitStorage.prototype.set = function(key, value, callback) {
    var self = this;
    var keysArray = key.split(":");
    logger.debug(keysArray);
    switch(keysArray[0])
    {
        case "OC":
            self.redis.set(key, value, callback);
            break;
        case "CD":
            self.redis.set(key, value);
            for(var index = 2; index < keysArray.length; index++) {
                var key2value = keysArray[index].split("=");
                value[key2value[0]] = key2value[1];
            }
            var commands = {"table":keysArray[1],"value":value};
            logger.debug(value);
            self.mysql.set(commands, callback);
            break;
        default:
            logger.error("[set]The format of key is uncompatible!");
    }
}

RabbitStorage.prototype.get = function(key, callback) {
    var self = this;
    var keysArray = key.split(":");
    logger.debug(keysArray);
    switch(keysArray[0])
    {
        case "OC":
            self.redis.get(key, callback);
            break;
        case "CD":
            self.redis.get(key, function(err ,res) {
                logger.debug("try get from redis");
                if(err) {
                    logger.debug(err);
                    var commands = {"table":keysArray[1],"column":"*"};
                    commands["where"] = "";
                    var ids = [];
                    for(var index = 2; index < keysArray.length; index++) {
                        var key2value = keysArray[index].split("=");
                        commands["where"] = commands["where"]+keys2value[0]+"="+keys2value[1]+" and ";
                        ids.push(key2value[0]);
                    }
                    commands["where"] = commands["where"].substring(commanes["where"].length-5);
                    logger.debug("try get from mysql");
                    logger.debug(commands);
                    self.mysql.get(commands, function(err, res) {
                        if(err)
                            logger.debug(err);
                        else {
                            res.forEach(function(oneRow) {
                                for(field in oneRow) {
                                    if(field in ids)
                                        continue;
                                    else {
                                        
                                    }
                                }
                            });
                        }
                    });
                }
            });
            break;
        default:
            logger.error("[get]The format of key is uncompatible!");
    }
}

exports.createRabbitStorage = function() {
    return new RabbitStorage();
}
