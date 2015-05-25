/**
 * @file refreshRabbitData.js
 * @brief refresh rabbit data
 * @author conansherry
 * @version 1.0
 * @date 2015-05-21
 */

var store   = require("../store/rabbitStore.js");
var async   = require("async");
var log4js  = require("log4js")
var logger  = log4js.getLogger("refreshRabbitData.js");
var request = require("request");

var fs = require("fs");

function RefreshRabbitData() {
    this.rabbitStore = store.createRabbitStore();
    this.requestUrl = "https://api.weibo.com/2/statuses/home_timeline.json?access_token=2.00TMKtHGJyWsQCe8ae180c5btvz2PB";
}

RefreshRabbitData.prototype.loadImage = function(imageUrl, callback) {
    var debugPrefix = "[loadImage]";
    var self = this;
    request.get({url:imageUrl, encoding:null}, function(err, res, body) {
        if(err)
            logger.error(debugPrefix+err);
        callback(err, body);
    });
};

RefreshRabbitData.prototype.parseDate = function(date) {
    return new Date(Date.parse(date.replace(/(\+)/,' UTC$1')));
};

RefreshRabbitData.prototype.isRabbit = function(uid) {
    if(uid == 1936163083 || uid == 5224711950)
        return true;
    else
        return false;
}

RefreshRabbitData.prototype.createRabbitObject = function(rabbit, photo, pics, type) {
    var debugPrefix = "[createRabbitObject]";
    var self = this;
    var rabbitObject = {id:rabbit["id"], title:rabbit["user"]["description"], thumbnail:photo, type:type, content:rabbit["text"], time:self.parseDate(rabbit["created_at"]).getTime(), pics:(pics.length > 0) ? pics.toString() : null, "location":rabbit["user"]["location"]};
    if(rabbit.hasOwnProperty("retweeted_status"))
        rabbitObject["extra"] = rabbit["retweeted_status"]["id"];
    logger.debug(debugPrefix+JSON.stringify(rabbitObject));
    return rabbitObject;
};

RefreshRabbitData.prototype.extractPictures = function(rabbitPicUrls, callback) {
    var debugPrefix = "[exetractPictures]";
    var self = this;
    var tasks = [];
    rabbitPicUrls.forEach(function(item) {
        tasks.push(
            function(cb) {
                logger.debug(item["thumbnail_pic"]);
                self.rabbitStore.addImages(item["thumbnail_pic"], function(err, res) {
                    cb(err, res[0]);
                });
            }
        );
        tasks.push(
            function(cb) {
                logger.debug(item["thumbnail_pic"].replace("thumbnail","bmiddle"));
                self.rabbitStore.addImages(item["thumbnail_pic"].replace("thumbnail","bmiddle"), function(err, res) {
                    cb(err, res[0]);
                });
            }
        );
        tasks.push(
            function(cb) {
                logger.debug(item["thumbnail_pic"].replace("thumbnail","large"));
                self.rabbitStore.addImages(item["thumbnail_pic"].replace("thumbnail","large"), function(err, res) {
                    cb(err, res[0]);
                });
            }
        );
    });
    async.series(tasks, function(err, res){
        if(err)
            logger.error(debugPrefix+err);
        else
            logger.debug(debugPrefix+res);
        callback(err, res);
    })
};

RefreshRabbitData.prototype.saveRabbit = function(rabbits, idList, callback) {
    var debugPrefix = "[saveRabbit]";
    var self = this;
    var date = new Date();
    var saveTasks = [];
    if(idList === null)
        idList = [];
    rabbits.forEach(function(rabbit){
        if(!self.isRabbit(rabbit["user"]["id"])) {
            return;
        }
        saveTasks.push(
            function(rabbitCallback) {
                var rabbitObjects = [];
                //先插入转发微博
                if(rabbit.hasOwnProperty("retweeted_status") && idList.indexOf(rabbit["retweeted_status"]["id"]) == -1) {
                    idList.push(rabbit["retweeted_status"]["id"]);
                    self.extractPictures(rabbit["retweeted_status"]["pic_urls"], function(err, retPics) {
                        self.rabbitStore.addImages(rabbit["retweeted_status"]["user"]["avatar_large"], function(err, retThumb) {
                            rabbitObjects.push(self.createRabbitObject(rabbit["retweeted_status"], retThumb[0], retPics, self.isRabbit(rabbit["retweeted_status"]["user"]["uid"]) ? 0 : 1));
                            //再插入主微博
                            idList.push(rabbit["id"]);
                            self.extractPictures(rabbit["pic_urls"], function(err, pics) {
                                logger.debug("TIME#"+self.parseDate(rabbit["created_at"]).getTime());
                                logger.debug("ID#"+rabbit["id"]);
                                logger.debug("TEXT#"+rabbit["text"]);
                                logger.debug("UID#"+rabbit["user"]["id"]);
                                logger.debug("AID#"+rabbit["user"]["avatar_large"]);
                                logger.debug("LOC#"+rabbit["user"]["location"]);
                                logger.debug("DES#"+rabbit["user"]["description"]);
                                if(pics.length > 0)
                                    logger.debug("PICS#"+pics.toString());
                                if(rabbit.hasOwnProperty("retweeted_status")) {
                                    logger.debug("RET#"+"转发ID "+rabbit["retweeted_status"]["id"]);
                                }
                                self.rabbitStore.addImages(rabbit["user"]["avatar_large"], function(err, thumb) {
                                    rabbitObjects.push(self.createRabbitObject(rabbit, thumb[0], pics, 0));
                                    self.rabbitStore.addNews(rabbitObjects, function(err, res) {
                                        if(err)
                                            logger.error(debugPrefix+err);
                                        else
                                            logger.debug(debugPrefix+"finish add news and ret_news");
                                        rabbitCallback(err, null);
                                    });
                                });
                            });
                        });
                    });
                }
                //只插入主微博
                else {
                    idList.push(rabbit["id"]);
                    self.extractPictures(rabbit["pic_urls"], function(err, pics) {
                        logger.debug("TIME#"+self.parseDate(rabbit["created_at"]).getTime());
                        logger.debug("ID#"+rabbit["id"]);
                        logger.debug("TEXT#"+rabbit["text"]);
                        logger.debug("UID#"+rabbit["user"]["id"]);
                        logger.debug("AID#"+rabbit["user"]["avatar_large"]);
                        logger.debug("LOC#"+rabbit["user"]["location"]);
                        logger.debug("DES#"+rabbit["user"]["description"]);
                        if(pics.length > 0)
                            logger.debug("PICS#"+pics.toString());
                        if(rabbit.hasOwnProperty("retweeted_status")) {
                            logger.debug("RET#"+"转发ID "+rabbit["retweeted_status"]["id"]);
                        }
                        self.rabbitStore.addImages(rabbit["user"]["avatar_large"], function(err, thumb) {
                            rabbitObjects.push(self.createRabbitObject(rabbit, thumb[0], pics, 0));
                            self.rabbitStore.addNews(rabbitObjects, function(err, res) {
                                if(err)
                                    logger.error(debugPrefix+err);
                                else
                                    logger.debug(debugPrefix+"finish add news");
                                rabbitCallback(err, null);
                            });
                        });
                    });
                }
            }
        );
    });
    async.series(saveTasks, function(err, res) {
        if(err)
            logger.error(debugPrefix+err);
        callback(err, null);
    });
};

RefreshRabbitData.prototype.load = function() {
    var debugPrefix = "[load]";
    var self = this;
    async.waterfall([
        function(callback) {
            logger.debug(debugPrefix+"step 1");
            self.rabbitStore.getNewsList(function(err, res) {
                if(err || res === null) {
                    logger.debug(debugPrefix+res);
                    callback(null, null);
                }
                else {
                    logger.debug(debugPrefix+"since ID:"+res[0]["id"]);
                    var idList = [];
                    res.forEach(function(item) {
                        idList.push(item["id"]);
                    });
                    if(idList.length > 0)
                        callback(null, idList);
                    else
                        callback(null, null);
                }
            });
        },
        function(idList, callback) {
            logger.debug(debugPrefix+"step 2");
            var sinceIdUrl = self.requestUrl;
            if(idList !== null) {
                sinceIdUrl = sinceIdUrl+"&since_id="+idList[0];
            }
            var totalCount = 0;
            var rabbitStatuses = [];
            var spider = function(url, page, count) {
                var spiderUrl = sinceIdUrl+"&page="+page+"&count="+count;
                logger.debug(debugPrefix+spiderUrl);
                request(spiderUrl, function(error, response, body) {
                    if(!error && response.statusCode == 200) {
                        var rabbit = JSON.parse(body);
                        if(rabbit["statuses"].length > 0) {
                            logger.debug(debugPrefix+"page"+page+" get "+rabbit["statuses"].length+" news");
                            totalCount = totalCount + rabbit["statuses"].length;
                            //微博数据数组合并
                            rabbitStatuses = rabbitStatuses.concat(rabbit["statuses"]);
                            if(rabbit["statuses"].length == count)
                                spider(url, page+1, count);
                            else
                                callback(null, rabbitStatuses, idList);
                        }
                        else {
                            callback(null, rabbitStatuses, idList);
                        }
                    }
                    else {
                        callback(err, null, null);
                    }
                });
            }
            spider(sinceIdUrl, 1, 100);
        },
        function(rabbitStatuses, idList, callback) {
            logger.debug(debugPrefix+"step 3");
            if(rabbitStatuses === null) {
                logger.warn(debugPrefix+"rabbitStatuses NULL");
                callback(err, null);
            }
            else {
                //倒序插入微博数据
                rabbitStatuses.reverse();
                logger.debug(debugPrefix+"prepare loading "+rabbitStatuses.length);
                self.saveRabbit(rabbitStatuses, idList, function(err, res) {
                    callback(err, "finish loading");
                });
            }
        }
    ], function(err, res) {
        if(err)
            logger.error(debugPrefix+err);
        else
            logger.debug(debugPrefix+res);
    });
};

exports.createRefreshRabbitData = function() {
    return new RefreshRabbitData();
};
