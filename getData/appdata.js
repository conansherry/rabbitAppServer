/**
 * @file appdata.js
 * @brief get News and Images
 * @author conansherry
 * @version 1.3
 * @date 2015-10-06
 */

var log4js = require("log4js");
var logger = log4js.getLogger("appdata.js");
var url    = require("url");
var async  = require("async");

var rabbitStorage;

exports.setRabbitStorageInstance = function(storage) {
    rabbitStorage = storage;
};

exports.getList = function(req, res) {
    var debugPrefix = "[getList]";
    rabbitStorage.getNewsList(function(err, newsList) {
        if(err)
            logger.error(debugPrefix+err);
        else {
            var strList = JSON.stringify(newsList);
            logger.info(debugPrefix+"request by:"+req.connection.remoteAddress+" send list.");
            res.send(strList);
        }
    });
};

var pic2url = function(numList, callback) {
    var debugPrefix = "[pic2url]";
    rabbitStorage.getImages(numList, function(err, imagesList) {
        logger.debug(debugPrefix+imagesList);
        callback(err, imagesList);
    });
};

var date2String = function(time) {
    var timeData = new Date();
    timeData.setTime(time);
    var day = timeData.getDate();
    var month = timeData.getMonth()+1;
    var year = timeData.getFullYear();
    return month+"-"+day+" "+timeData.toLocaleTimeString();
}

var extractNews = function(allIds, finalCallback) {
    var debugPrefix = "[extractNews]";
    rabbitStorage.getNews(allIds, function(err, news) {
        var tasks = [];
        news.forEach(function(oneNew) {
            tasks.push(function(newCallback) {
                if(oneNew) {
                    oneNew["time"] = date2String(oneNew["time"]);
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
                                rabbitStorage.getNews(oneNew["extra"], function(err, single) {
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
            finalCallback(err, sendResult);
        });
    });
};

exports.getNews = function(req, res) {
    var debugPrefix = "[getNews]";
    logger.info(debugPrefix+req.url);
    logger.info(debugPrefix+"request by:"+req.connection.remoteAddress);
    var args = url.parse(req.url, true).query;
    if(args.hasOwnProperty("since_id")) {
        rabbitStorage.getNewsList(function(err, newsList) {
            if(err) {
                logger.error(debugPrefix+err);
                res.end();
            }
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
                extractNews(allIds, function(err, sendResult) {
                    res.send(sendResult);
                });
            }
        });
    }
    else {
        var count = 20;
        if(args.hasOwnProperty("count")) {
            count = parseInt(args.count);
        }
        var max_id = -1;
        if(args.hasOwnProperty("max_id")) {
            max_id = parseInt(args.max_id);
        }

        rabbitStorage.getNewsList(function(err, newsList) {
            if(err) {
                logger.error(debugPrefix+err);
                res.end();
            }
            else {
                var allIds = [];
                newsList.forEach(function(item) {
                    allIds.push(item["id"]);
                });
                var first = 0;
                if(max_id > 0) {
                    for(first = 0; first < allIds.length; first++) {
                        if(max_id > allIds[first])
                            break;
                    }
                }
                allIds = allIds.slice(first, Math.min(allIds.length, first+count));
                extractNews(allIds, function(err, sendResult) {
                    res.send(sendResult);
                });
            }
        });
    }
};
