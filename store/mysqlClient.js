/**
 * @file mysqlClient.js
 * @brief mysql client
 * @author conansherry
 * @version 1.0
 * @date 2015-05-17
 */

var mysql  = require("mysql");
var async  = require("async");
var log4js = require("log4js")
var logger = log4js.getLogger("mysqlClient.js");

var pool   = mysql.createPool({
    connectionLimit : 100,
    host            : "localhost",
    user            : "rabbit",
    password        : "rabbit",
    database        : "rabbitdb",
    dateStrings     : true,
    charset         : 'utf8'
});

function RabbitMysqlClient() {
    this.client = pool;
}

/**
 * @brief function insert into table on duplicate key update
 *
 * @param commands js object. example:{"table":"person","value":{"id":6,"name":"lan1","age":17,"thumbnail":new Buffer(fs.readFileSync('./thumbnail.jpg'))}}. type/table/value is necessary.
 * @param callback(err,res)
 *
 * @return undefined
 */
RabbitMysqlClient.prototype.set = function(commands, callback) {
    var debugPrefix = "[mysql set]";
    var self = this;
    self.client.getConnection(function(err, connection) {
        var sql = "insert into "+commands["table"]+" set ?";
        sql = sql+" on duplicate key update ";
        for(field in commands["value"]) {
            sql = sql+field+"=values("+field+") ,";
        }
        sql = sql.substring(0, sql.length-2);
        logger.debug(debugPrefix+sql);
        connection.query(sql, commands["value"], function(err, res) {
            callback(err, res);
            logger.debug(debugPrefix+"release connection");
            connection.release();
        });
    });
};

/**
 * @brief function select from table
 *
 * @param commands js object. example:{"table":"person","column":"name","where":"name='conan' and age=10"}. type/table/column is necessary. where is optional.
 * @param callback(err, rows, fields)
 *
 * @return undefined
 */
RabbitMysqlClient.prototype.get = function(commands, callback) {
    var debugPrefix = "[mysql get]";
    var self = this;
    self.client.getConnection(function(err, connection) {
        var sql = "select "+commands["column"]+" from "+commands["table"];
        if("where" in commands) {
            sql = sql+" where "+commands["where"];
        }
        if("order" in commands) {
            sql = sql+" order by "+commands["order"];
        }
        logger.debug(debugPrefix+sql);
        connection.query(sql, function(err, res){
            callback(err, res);
            logger.debug(debugPrefix+"release connection");
            connection.release();
        });
    })
};

/**
 * @brief function createRabbitMysqlClient()
 *
 * @return instance of client
 */
exports.createRabbitMysqlClient = function() {
    return new RabbitMysqlClient();
};
