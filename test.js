var redis = require("redis");
//redis.debug_mode = true

var client = redis.createClient();

for(var i = 0; i < 1000; i++) {
    client.set("key",i);
    client.get("key", function(err, reply){
        console.log(reply);
    });
    client.set("key","val");
}
