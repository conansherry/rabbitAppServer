/**
 * @file redisClient.js
 * @brief redis client by nodejs
 * @author conansherry
 * @version 1.0
 * @date 2015-05-16
 */

var redis  = require("redis");
var util   = require("util");
var events = require("events");
var async  = require("async");

//redis.debug_mode = true;

function RabbitRedisClient() {
    this.client = redis.createClient({detect_buffers:true});
}


/**
 * @brief function set & hmset
 *
 * @param key
 * @param value
 * @param callback ptr to function, err is error info, reply is value of the key.
 *
 * @return undefined
 */
RabbitRedisClient.prototype.set = function(key, value, callback) {
    var callbackType = typeof callback;
    if(typeof value === "string" || value instanceof Buffer) {
        if(callbackType === undefined || callbackType === null)
            this.client.set(key, value);
        else
            this.client.set(key, value, callback);
    }
    else {
        if(callback === undefined || callback === null)
            this.client.hmset(key, value);
        else
            this.client.hmset(key, value, callback);
    }
}

/**
 * @brief function example: get("key", function(err, reply){
 *     //do sth. in here.
 *     //reply is the value.
 * })
 *
 * @param key
 * @param callback ptr to function, err is error info, reply is value of the key.
 *
 * @return undefined
 */
RabbitRedisClient.prototype.get = function(key, callback) {
    var self = this;
    async.waterfall([
        function(innerCallback) {
            self.client.type(key, function(err, reply) {
                innerCallback(err, reply);
            });
        },
        function(reply, innerCallback) {
            if(reply === "hash") {
                self.client.hgetall(key, function(err, reply) {
                    innerCallback(err, reply);
                });
            }
            else if(reply === "string") {
                self.client.get(key, function(err, reply) {
                    innerCallback(err, reply);
                });
            }
        }
    ],  function(err, reply) {
        callback(err, reply);
    });
}

/**
 * @brief function del
 *
 * @param key
 * @param callback ptr to function, err is error info, reply is value of the key.
 *
 * @return undefined
 */
RabbitRedisClient.prototype.del = function(key, callback) {
    this.client.del(key, callback);
}

/**
 * @brief function close the connection of redis
 *
 * @return undefined
 */
RabbitRedisClient.prototype.close = function() {
    this.client.quit();
}

/**
 * @brief function createRabbitReddisClient
 *
 * @return instance of client
 */
exports.createRabbitRedisClient = function () {
    return new RabbitRedisClient();
}

