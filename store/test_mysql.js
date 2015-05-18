var client = require("./mysqlClient.js");

var mysql = client.createRabbitMysqlClient();

mysql.get({"type":"select","table":"person","column":"name","where":"name='conan' and age=10"}, function(err, rows, fields) {
    rows.forEach(function(person) {
        console.log(person);
    })
});

mysql.set({"type":"insert","table":"person","value":{"id":"3","name":"lan","age":17},"update":{"name":"wokao","age":20}}, function(err, res) {console.log("final callback")});

