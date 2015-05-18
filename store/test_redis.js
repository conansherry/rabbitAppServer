/**
 * @file test.js
 * @brief test
 * @author conansherry
 * @version 1.0
 * @date 2015-05-16
 */

var redisClient = require("./redisClient.js");

var redis = redisClient.createRabbitRedisClient();

redis.set("key", new Buffer("hello"));
redis.get("key", function(err, reply) {
    console.log("get reply:"+reply.toString());
    redis.del("key", function(err, reply) {
        console.log("redis.del"+reply);
        redis.close();
    });
});

//redis.set("key", {"hello":"world", "1":"2"});
//redis.get("key", function(err, reply) {
//    console.log("in this 2");
//    console.dir(reply);
//});

//redis.close();
