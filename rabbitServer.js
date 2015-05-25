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
log4js.setGlobalLogLevel("INFO");
var logger      = log4js.getLogger("rabbitStore.js");
var store       = require("./store/rabbitStore.js");
var url         = require("url");

var rabbitStore = store.createRabbitStore();

app.get("/", function(req, res) {
    res.send("菟籽琳数据服务器. Power by conansherry. Email:conansherry@163.com");
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
    logger.info(debugPrefix+req.url);
    var pic2url = function(numList, callback) {
        rabbitStore.getImages(numList, function(err, imagesList) {
            logger.debug(debugPrefix+imagesList);
            callback(err, imagesList);
        });
    };
    var args = url.parse(req.url, true).query;
    if(args.hasOwnProperty("since_id")) {
        rabbitStore.getNewsList(function(err, newsList) {
            if(err)
                logger.error(debugPrefix+err);
            else {
                var allIds = [];
                newsList.forEach(function(item) {
                    allIds.push(item["id"]);
                });
                var index = 0;
                for(index = 0; index < allIds.length; index++) {
                    logger.debug(debugPrefix+args.since_id+" vs "+allIds[index]);
                    if(args.since_id >= allIds[index])
                        break;
                }
                allIds = allIds.slice(0, index);
                logger.info(debugPrefix+"slice index="+index);
                rabbitStore.getNews(allIds, function(err, news) {
                    var tasks = [];
                    news.forEach(function(oneNew) {
                        tasks.push(function(newCallback) {
                            if(oneNew) {
                                logger.debug(oneNew);
                                async.parallel([
                                    function(callback) {
                                        pic2url(oneNew["thumbnail"], function(err, thumbnail) {
                                            oneNew["thumbnail"] = thumbnail;
                                            logger.debug(thumbnail);
                                            callback(null);
                                        });
                                    },
                                    function(callback) {
                                        if(oneNew.hasOwnProperty("pics") && oneNew["pics"] !== null) {
                                            var picArray = JSON.parse("["+oneNew["pics"]+"]");
                                            pic2url(picArray, function(err, pics) {
                                                oneNew["pics"] = pics;
                                                logger.debug(pics);
                                                callback(null);
                                            });
                                        }
                                        else
                                            callback(null);
                                    },
                                    function(callback) {
                                        if(oneNew.hasOwnProperty("extra") && oneNew["extra"] !== null) {
                                            //转发微博
                                            rabbitStore.getNews(oneNew["extra"], function(err, single) {
                                                var extraInfo = single[0];
                                                async.parallel([
                                                    function(extraCallback) {
                                                        pic2url(extraInfo["thumbnail"], function(err, thumbnail) {
                                                            extraInfo["thumbnail"] = thumbnail;
                                                            logger.debug(thumbnail);
                                                            extraCallback(null);
                                                        });
                                                    },
                                                    function(extraCallback) {
                                                        if(extraInfo.hasOwnProperty("pics") && extraInfo["pics"] !== null) {
                                                            var singlePicArray = JSON.parse("["+extraInfo["pics"]+"]");
                                                            pic2url(singlePicArray, function(err, pics) {
                                                                extraInfo["pics"] = pics;
                                                                logger.debug(pics);
                                                                extraCallback(null);
                                                            });
                                                        }
                                                        else
                                                            extraCallback(null);
                                                    }
                                                ], function(err, res) {
                                                    oneNew["extra"] = extraInfo;
                                                    callback(null);
                                                });
                                            });
                                        }
                                        else
                                            callback(null);
                                    }
                                ], function(err, res) {
                                        logger.debug(debugPrefix+"translate done");
                                        //result.push(oneNew);
                                        newCallback(null, oneNew);
                                    }
                                );
                            }
                            else
                                newCallback(null);
                        });
                    });
                    async.parallel(tasks, function(err, sendResult) {
                        logger.info(debugPrefix+"send "+sendResult.length+" news");
                        res.send(sendResult);
                    });
                });
            }
        });
    }
    else {
        res.send("wrong args");
    }
});

var server = app.listen(8888, function() {
    var host = server.address().address;
    var port = server.address().port;
    logger.info("Start RabbitServer. Listening at http://%s:%s", host, port);
});
