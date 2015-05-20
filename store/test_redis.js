/**
 * @file test.js
 * @brief test
 * @author conansherry
 * @version 1.0
 * @date 2015-05-16
 */

var redisClient = require("./redisClient.js");
var fs = require("fs");
var redis = redisClient.createRabbitRedisClient();

redis.set("key", new Buffer("hello"));
redis.get("key", function(err, reply) {
    console.log("get reply:"+reply.toString());
    redis.del("key", function(err, reply) {
        console.log("redis.del"+reply);
        redis.close();
    });
});

redis.set("key", [new Buffer(fs.readFileSync("./thumbnail.jpg").toString('base64')), new Buffer("world").toString('base64')], function(err, res) {
    redis.get("key", function(err, reply) {
        console.log("get reply:",reply);
        //redis.del("key", function(err, reply){
        //    console.log("redis.del"+reply);
        //    redis.close();
        //});
        redis.close();
    });
});

//redis.set("key", {"hello":"world", "1":"2"});
//redis.get("key", function(err, reply) {
//    console.log("in this 2");
//    console.dir(reply);
//});

//redis.close();
