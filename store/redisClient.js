/**
 * @file redisClient.js
 * @brief redis client by nodejs
 * @author conansherry
 * @version 1.0
 * @date 2015-05-16
 */

var redis  = require("redis");
var async  = require("async");
var log4js = require("log4js")
var logger = log4js.getLogger("redisClient.js");

//redis.debug_mode = true;

/*
 * redis+node work in single thread. use global redis handler;
 */
var redisClient = redis.createClient();
function RabbitRedisClient() {
    this.client = redisClient;
}


/**
 * @brief function set & rpush & hmset. set and hmset can store the binary data, but rpush can't support this feature.
 *
 * @param key
 * @param value
 * @param callback(err, res)
 *
 * @return undefined
 */
RabbitRedisClient.prototype.set = function(key, value, callback) {
    var debugPrefix = "[redis set]";
    var self = this;
    var callbackType = typeof callback;
    if(value instanceof Buffer) {
        logger.debug(debugPrefix+"use set");
        if(callbackType === undefined || callbackType === null)
            self.client.set(key, value);
        else
            self.client.set(key, value, callback);
    }
    else {
        logger.debug(debugPrefix+"use json");
        self.client.set(key, JSON.stringify(value), callback);
    }
};

/**
 * @brief function example: get("key", function(err, res){
 *     //do sth. in here.
 *     //res is the value.
 * })
 *
 * @param key
 * @param callback(err, res)
 *
 * @return undefined
 */
RabbitRedisClient.prototype.get = function(key, callback) {
    var debugPrefix = "[redis get]";
    logger.debug(debugPrefix+"in redisGet. key = "+key);
    var self = this;
    async.waterfall([
        function(cb) {
            logger.debug(debugPrefix+"in getType");
            self.client.type(key, function(err, res) {
                if(err)
                    logger.error(debugPrefix+err);
                cb(err, res);
            });
        },
        function(res, cb) {
            logger.debug(debugPrefix+"type = " + res);
            if(res === "string") {
                logger.debug(debugPrefix+"get "+res);
                self.client.get(key, function(err, res) {
                    if(err)
                        logger.error(debugPrefix+err);
                    cb(err, JSON.parse(res));
                });
            }
            else if(res == "none") {
                cb(new Error("key "+key+" can't be found"));
            }
            else {
                self.client.del(key);
                cb(new Error("Unknown type"));
            }
        }
    ],  function(err, res) {
        callback(err, res);
    });
};

/**
 * @brief function del
 *
 * @param key
 * @param callback(err, res) ptr to function, err is error info, res is value of the key.
 *
 * @return undefined
 */
RabbitRedisClient.prototype.del = function(key, callback) {
    this.client.del(key, callback);
};

/**
 * @brief function close the connection of redis
 *
 * @return undefined
 */
RabbitRedisClient.prototype.close = function() {
    this.client.quit();
};

/**
 * @brief function createRabbitReddisClient
 *
 * @return instance of client
 */
exports.createRabbitRedisClient = function () {
    return new RabbitRedisClient();
};
