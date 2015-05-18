/**
 * @file mysqlClient.js
 * @brief mysql client
 * @author conansherry
 * @version 1.0
 * @date 2015-05-17
 */

var mysql = require("mysql");
var async = require("async");
var pool  = mysql.createPool({
    connectionLimit : 100,
    host            : "localhost",
    user            : "rabbit",
    password        : "rabbit",
    database        : "rabbitdb"
});

function RabbitMysqlClient() {
    this.client = pool;
}

RabbitMysqlClient.prototype.get = function(commands, callback) {
    var self = this;
    if("type" in commands && commands["type"].toLowerCase() == "select") {
        self.client.getConnection(function(err, connection) {
            var sql = "select "+commands["column"]+" from "+commands["table"];
            if("where" in commands) {
                sql = sql+" where "+commands["where"];
            }
            console.log(sql);
            connection.query(sql, callback);
        })
    }
}

RabbitMysqlClient.prototype.set = function(commands, callback) {
    var self = this;
    if("type" in commands && commands["type"].toLowerCase() == "insert") {
        console.log("in type");
        self.client.getConnection(function(err, connection) {
            console.log("in connection");
            var sql = "insert into "+commands["table"]+" set ?";
            console.log(sql);
            if("update" in commands) {
                console.log("in update");
                sql = sql+" on duplicate key update set ?";
                console.log(sql);
                async.waterfall([
                    function(innerCallback) {
                        connection.query(sql, [commands["value"],commands["update"]], function(err, res) {
                            innerCallback(err, res);
                            connection.release();
                            console.log("release");
                        });
                    }
                ],  function(err, res) {
                    callback(err, res);
                });
            }
        })
    }
}

exports.createRabbitMysqlClient = function() {
    return new RabbitMysqlClient();
}
