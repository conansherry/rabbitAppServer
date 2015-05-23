/**
 * @file spider.js
 * @brief data spider
 * @author conansherry
 * @version 1.0
 * @date 2015-05-21
 */

var request           = require("request");
var log4js            = require("log4js")
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file("/mnt/log/dataSpider.log"));
var refreshRabbitData = require("./refreshRabbitData.js");

var spider = refreshRabbitData.createRefreshRabbitData();
spider.load();
setInterval(
    function() {
        spider.load();
    }, 300000+Math.round(Math.random()*30000-15000));
