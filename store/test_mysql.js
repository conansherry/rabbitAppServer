var client = require("./mysqlClient.js");
var fs = require("fs");
var log4js = require("log4js")
var logger = log4js.getLogger("test_mysql.js");

var mysql = client.createRabbitMysqlClient();

mysql.get({"type":"select","table":"person","column":"name","where":"name='conan' and age=10"}, function(err, rows, fields) {
    rows.forEach(function(person) {
        logger.debug(person);
    })
});

var fs = require("fs");
mysql.set({"type":"insert","table":"person","value":{"id":6,"name":"lan1","age":17,"thumbnail":new Buffer(fs.readFileSync('./thumbnail.jpg'))}}, function(err, res) {
    if(err) logger.debug(err);

    mysql.get({"type":"select","table":"person","column":"thumbnail","where":"id=6"}, function(err, rows, fields) {
        logger.debug(rows[0]["thumbnail"] instanceof Buffer);
        fs.writeFileSync("./sqlthumbnail.jpg",rows[0]["thumbnail"]);
    })
    logger.debug("final callback")});
