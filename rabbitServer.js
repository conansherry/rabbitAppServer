/**
 * @file rabbitServer.js
 * @brief rabbitServer
 * @author conansherry
 * @version 1.0
 * @date 2015-05-23
 */

var express     = require("express");
var app         = express();
var async       = require("async");
var log4js      = require("log4js")
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("/mnt/log/rabbitServer.log"));
var logger      = log4js.getLogger("rabbitStore.js");
var store       = require("./store/rabbitStore.js");
var url         = require("url");

var rabbitStore = store.createRabbitStore();

app.get("/", function(req, res) {
    res.send("菟籽琳数据服务器. Power by conansherry. email:conansherry@163.com");
});

app.get("/getList", function(req, res) {
    var debugPrefix = "[getList]";
    rabbitStore.getNewsList(function(err, newsList) {
        if(err)
            logger.error(debugPrefix+err);
        else {
            var strList = JSON.stringify(newsList);
            logger.info(debugPrefix+"request by:"+req.connection.remoteAddress+" send list.");
            res.send(strList);
        }
    });
});

app.get("/getNews", function(req, res) {
    var debugPrefix = "[getNews]";
    logger.debug(debugPrefix+req.url);
    var args = url.parse(req.url, true).query;
    var idList = JSON.parse("["+args.id+"]");
    logger.info(debugPrefix+"request by:"+req.connection.remoteAddress+" for news by ids: "+idList);
    rabbitStore.getNews(idList, function(err, news) {
        logger.debug(news);
        var result = [];
        news.forEach(function(oneNew) {
            if(oneNew) {
                //result.push(JSON.stringify(oneNew));
                result.push(oneNew);
            }
        });
        res.send(result);
    });
});

var server = app.listen(8888, function() {
    var host = server.address().address;
    var port = server.address().port;
    logger.info("Start RabbitServer. Listening at http://%s:%s", host, port);
});
