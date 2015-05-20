/**
 * @file store.js
 * @brief combine redis&mysql
 * @author conansherry
 * @version 1.0
 * @date 2015-05-18
 */

var redisModule = require("./redisClient.js");
var mysqlModule = require("./mysqlClient.js");
var async       = require("async");
var log4js      = require("log4js")
var logger      = log4js.getLogger("rabbitStore.js");

function RabbitStore() {
    this.redis = redisModule.createRabbitRedisClient();
    this.mysql = mysqlModule.createRabbitMysqlClient();
}

RabbitStore.prototype.getNewsList = function(callback) {
    var debugPrefix = "[getNewsList]";
    var self = this;
    self.redis.get("OC:NEWS:LIST", function(err, res) {
        logger.debug(debugPrefix+typeof res);
        if(err) {
            logger.warn(debugPrefix+err.message);
            self.mysql.get({"table":"news","column":"id","order":"time desc"}, function(err, res) {
                if(err || res.length == 0) {
                    callback(err, null);
                }
                else {
                    var newsList = [];
                    res.forEach(function(row) {
                        newsList.push(row);
                    });
                    logger.debug(debugPrefix+JSON.stringify(newsList));
                    self.redis.set("OC:NEWS:LIST", newsList, function(err, res) {
                        if(err)
                            logger.error(debugPrefix+"set redis. "+err);
                        else
                            logger.debug(debugPrefix+"set redis. "+res);
                    });
                    callback(err, res);
                }
            });
        }
        else {
            logger.debug(debugPrefix+"no err");
            callback(err, res);
        }
    });
};

RabbitStore.prototype.addNews = function(newsObject, callback) {
    var debugPrefix = "[addNews]";
    var self = this;
    var addOneNews = function(oneNews, cb){
        async.waterfall([
            function(wfcb) {
                self.mysql.get({"table":"news","column":"max(id) as maxid"}, function(err, res) {
                    if(err || res.length == 0) {
                        wfcb(err, null);
                    }
                    else {
                        if(res[0]["maxid"] === null)
                            wfcb(null, 0);
                        else
                            wfcb(null, res[0]["maxid"]);
                    }
                });
            },
            function(maxid, wfcb) {
                maxid++;
                oneNews["id"] = maxid;
                self.mysql.set({"table":"news","value":oneNews}, function(err, res) {
                    if(err) {
                        wfcb(err, null);
                    }
                    else {
                        async.parallel([
                            function(pcb) {
                                logger.debug(debugPrefix+oneNews);
                                self.redis.set("CD:NEWS:"+maxid, oneNews, function(err, res) {
                                    pcb(err, res);
                                });
                            },
                            function(pcb) {
                                self.redis.del("OC:NEWS:LIST", function(err, res){
                                    pcb(err, res);
                                });
                            }
                        ], function(err, res) {
                            if(err) {
                                wfcb(err, null);
                            }
                            else {
                                wfcb(err, maxid);
                            }
                        });
                    }
                });
            }
        ], function(err, res) {
            logger.debug(debugPrefix+" return id "+res);
            cb(err, res);
        });
    };
    logger.debug(debugPrefix+JSON.stringify(newsObject));
    if(!(newsObject instanceof Array)) {
        logger.debug(debugPrefix+"oneObject");
        newsObject = [newsObject];
    }
    logger.debug(debugPrefix+"arrayObjects");
    var tasks = [];
    newsObject.forEach(function(item) {
        tasks.push(function(cb) {
            addOneNews(item, cb);
        });
    });
    async.series(tasks, callback);
};

RabbitStore.prototype.getNews = function(idList, callback) {
    var debugPrefix = "[getNews]";
    var self = this;
    var tasks = [];
    if(!(idList instanceof Array)) {
        idList = [idList];
    }
    idList.forEach(function(item) {
        tasks.push(function(cb) {
            self.redis.get("CD:NEWS:"+item, function(err, res) {
                if(err) {
                    logger.warn(debugPrefix+err.message);
                    self.mysql.get({"table":"news","column":"*","where":"id="+item}, function(err, res) {
                        if(err || res.length == 0) {
                            cb(err, null);
                        }
                        else {
                            self.redis.set("CD:NEWS:"+item, res[0], function(err, res) {
                                logger.debug(debugPrefix+"set redis success");
                            });
                            cb(err, res[0]);
                        }
                    });
                }
                else {
                    logger.debug(debugPrefix+"success in idLists");
                    cb(err, res);
                }
            });
        });
    });
    async.parallel(tasks, callback);
};

RabbitStore.prototype.addImages = function(imagesObject, callback) {
    var debugPrefix = "[addImages]";
    var self = this;
    var addImage = function(image, cb) {
        async.waterfall([
            function(wfcb) {
                self.mysql.get({"table":"images","column":"max(id) as maxid"}, function(err, res) {
                    if(err || res.length == 0) {
                        wfcb(err, null);
                    }
                    else {
                        logger.debug(debugPrefix+"after select. res:"+JSON.stringify(res));
                        if(res[0]["maxid"] === null)
                            wfcb(null, 0);
                        else
                            wfcb(null, res[0]["maxid"]);
                    }
                });
            },
            function(maxid, wfcb) {
                maxid++;
                logger.debug(debugPrefix+"ready to insert image id:"+maxid);
                self.mysql.set({"table":"images","value":{"id":maxid,"data":new Buffer(image, 'base64')}}, function(err, res) {
                    if(err) {
                        wfcb(err, null);
                    }
                    else {
                        logger.debug(debugPrefix+"mysql "+res);
                        self.redis.set("CD:IMAGES:"+maxid, image, function(err, res) {
                            if(err)
                                wfcb(err, null);
                            else
                                wfcb(null, maxid);
                        });
                    }
                });
            }
        ], function(err, res) {
            if(err)
                logger.error(debugPrefix+err);
            else
                logger.debug(debugPrefix+res);
            cb(err, res);
        });
    };
    logger.debug(debugPrefix+"add images");
    if(!(imagesObject instanceof Array)) {
        logger.debug(debugPrefix+"oneObject");
        imagesObject = [imagesObject];
    }
    logger.debug(debugPrefix+"arrayObjects");
    var tasks = [];
    imagesObject.forEach(function(item) {
        tasks.push(function(cb) {
            addImage(item, cb);
        });
    });
    async.series(tasks, callback);
};

RabbitStore.prototype.getImages = function(idList, callback){
    var debugPrefix = "[getImages]";
    var self = this;
    if(!(idList instanceof Array)) {
        idList = [idList];
    }
    var tasks = [];
    idList.forEach(function(item) {
        tasks.push(function(cb) {
            self.redis.get("CD:IMAGES:"+item, function(err, res) {
                if(err) {
                    logger.warn(debugPrefix+err.message);
                    self.mysql.get({"table":"images","column":"*","where":"id="+item}, function(err, res) {
                        if(err || res.length == 0) {
                            logger.debug(debugPrefix+err);
                            cb(err, null);
                        }
                        else {
                            res[0]["data"] = res[0]["data"].toString("base64");
                            self.redis.set("CD:IMAGES:"+item, res[0], function(err, res) {
                                logger.debug(debugPrefix+"set redis success");
                            });
                            cb(err, res[0]);
                        }
                    });
                }
                else {
                    logger.debug(debugPrefix+"success in idLists");
                    cb(err, res);
                }
            });
        });
    });
    async.parallel(tasks, callback);
};

exports.createRabbitStore = function() {
    return new RabbitStore();
};
