/**
 * @file rabbitServer.js
 * @brief rabbitServer
 * @author conansherry
 * @version 1.0
 * @date 2015-05-23
 */

var express     = require("express");
var app         = express();
var log4js      = require("log4js");
var config      = require("config");
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("/mnt/log/rabbitServer.log"));
log4js.setGlobalLogLevel("DEBUG");
//log4js.setGlobalLogLevel("INFO");
var logger      = log4js.getLogger("rabbitStorage.js");
var storage     = require("./storage/rabbitStorage.js");
var register    = require("./passport/register.js");
var appdata     = require("./getData/appdata.js");

var storageConf = config.get("storage");

/*
 * has only one rabbitStorage
 */
var rabbitStorage = storage.createRabbitStorage(storageConf);
register.setRabbitStorageInstance(rabbitStorage);
appdata.setRabbitStorageInstance(rabbitStorage);

app.use(require('body-parser').urlencoded({extended : true}));

app.get("/", function(req, res) {
    res.send("菟籽琳数据服务器. Power by conansherry. Email:conansherry.hy@gmail.com");
});

app.post("/register", register.register);

app.get("/update", function(req, res) {
    var debugPrefix = "[update]";
    logger.info(debugPrefix+"request by:"+req.connection.remoteAddress+" want to update");
    var updateObject={"version":1.2, "url":"http://120.25.122.107:8989/apk/rabbit.apk", "info":"*修复网络状态差时可能出现的bug\n*增加启动画面更新功能"};
    res.send(JSON.stringify(updateObject));
});

app.get("/getList", appdata.getList);

app.get("/getNews", appdata.getNews);

var server = app.listen(config.get('server.listen'), function() {
    var host = server.address().address;
    var port = server.address().port;
    logger.info("Start RabbitServer. Listening at http://%s:%s", host, port);
});
