/**
 * @file storage.js
 * @brief combine redis&mysql
 * @author conansherry
 * @version 1.0
 * @date 2015-05-18
 */

var redisModule = require("./redisClient.js");
var mysqlModule = require("./mysqlClient.js");
var async       = require("async");
var log4js      = require("log4js");
var logger      = log4js.getLogger("rabbitStorage.js");

function RabbitStorage(options) {
    this.redis = redisModule.createRabbitRedisClient(options.redis);
    this.mysql = mysqlModule.createRabbitMysqlClient(options.mysql);
}

RabbitStorage.prototype.getNewsList = function(callback) {
    var debugPrefix = "[getNewsList]";
    var self = this;
    self.redis.get("OC:NEWS:LIST", function(err, res) {
        logger.debug(debugPrefix+typeof res);
        if(err) {
            logger.warn(debugPrefix+err.message);
            self.mysql.get({"table":"news","column":"id","where":"type=0","order":"time desc"}, function(err, res) {
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

RabbitStorage.prototype.addNews = function(newsObject, callback) {
    var debugPrefix = "[addNews]";
    var self = this;
    var addOneNews = function(oneNews, cb){
        async.waterfall([
            function(wfcb) {
                if(oneNews.hasOwnProperty("id")) {
                    wfcb(null, oneNews["id"]);
                }
                else {
                    self.mysql.get({"table":"news","column":"max(id) as maxid"}, function(err, res) {
                        if(err || res.length == 0) {
                            wfcb(err, null);
                        }
                        else {
                            if(res[0]["maxid"] === null)
                                wfcb(null, 0);
                            else
                                wfcb(null, res[0]["maxid"]+1);
                        }
                    });
                }
            },
            function(newsId, wfcb) {
                oneNews["id"] = newsId;
                self.mysql.set({"table":"news","value":oneNews}, function(err, res) {
                    if(err) {
                        logger.error(debugPrefix+err);
                        logger.error(new Buffer(oneNews["content"]));
                        wfcb(err, null);
                    }
                    else {
                        async.parallel([
                            function(pcb) {
                                logger.debug(debugPrefix+"del newsId:"+newsId);
                                self.redis.set("CD:NEWS:"+newsId, oneNews, function(err, res) {
                                    pcb(err, res);
                                });
                            },
                            function(pcb) {
                                if(oneNews["type"] == 0) {
                                    self.redis.del("OC:NEWS:LIST", function(err, res){
                                        pcb(err, res);
                                    });
                                }
                                else
                                    pcb(err, res);
                            }
                        ], function(err, res) {
                            if(err) {
                                wfcb(err, null);
                            }
                            else {
                                wfcb(err, newsId);
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

RabbitStorage.prototype.getNews = function(idList, callback) {
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

RabbitStorage.prototype.addImages = function(imagesObject, callback) {
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
                self.mysql.set({"table":"images","value":{"id":maxid,"data":image}}, function(err, res) {
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

RabbitStorage.prototype.getImages = function(idList, callback) {
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
                    self.mysql.get({"table":"images","column":"data","where":"id="+item}, function(err, res) {
                        if(err || res.length == 0) {
                            logger.debug(debugPrefix+err);
                            cb(err, null);
                        }
                        else {
                            self.redis.set("CD:IMAGES:"+item, res[0]["data"], function(err, res) {
                                logger.debug(debugPrefix+"set redis success");
                            });
                            cb(err, res[0]["data"]);
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

RabbitStorage.prototype.getUser = function(name, callback) {
    var debugPrefix = "[getUser]";
    var self = this;
    self.mysql.get({"table" : "user", "column" : "name", "where" : "name='" + name + "'"}, function(err, res) {
        if(err || res.length != 1) {
            logger.info(debugPrefix + "no user");
            callback(new Error("NO_USER"));
        }
        else {
            callback(null, res[0].name);
        }
    });
};

RabbitStorage.prototype.verifyUser = function(name, callback) {
    var debugPrefix = "[verifyUser]";
    var self = this;
    self.redis.hashget("CD:NAMEPWD:" + name, function(err, res) {
        if(err || res == null) {
            if(err)
                logger.error(debugPrefix + err.message);
            else
                logger.debug(debugPrefix + "res == null");
            self.mysql.get({"table" : "user", "column" : "name, pwd", "where" : "name='" + name + "'"}, function(err, res) {
                if(err || res.length !=1) {
                    logger.debug(debugPrefix + "no user");
                    callback(new Error("NO_USER"));
                }
                else {
                    logger.debug(debugPrefix + JSON.stringify(res));
                    self.redis.hashset("CD:NAMEPWD:" + name, res[0], function(err, res) {
                        if(err)
                            logger.error(debugPrefix + err.message);
                    });
                    callback(null, res[0]);
                }
            });
        }
        else {
            logger.debug(debugPrefix + JSON.stringify(res));
            callback(null, res);
        }
    });
};

RabbitStorage.prototype.getUserInfo = function(name, pwd, callback) {
    var debugPrefix = "[getUserInfo]";
    var self = this;
    self.mysql.get({"table" : "user", "column" : "*", "where" : "name='" + name + "' and pwd='" + pwd + "'"}, function(err, res) {
        if(err || res.length != 1) {
            logger.debug(debugPrefix + "no user or pwd error");
            callback(new Error("NON_VALID"));
        }
        else {
            callback(null, res);
        }
    });
};

RabbitStorage.prototype.innerVerifyUser = function(name, pwd, callback) {
    var debugPrefix = "[innerVerifyUser]";
    var self = this;
    self.mysql.get({"table" : "user", "column" : "uid", "where" : "name='" + name + "' and pwd='" + pwd + "'"}, function(err, res) {
        if(err || res.length != 1) {
            logger.debug(debugPrefix + "no user or pwd error");
            callback(new Error("NON_VALID"));
        }
        else {
            callback(null, res);
        }
    });
};

RabbitStorage.prototype.addUser = function(userinfo, callback) {
    var debugPrefix = "[addUser]";
    var self = this;
    self.mysql.set({"table" : "user", "value" : userinfo}, function(err, res) {
        if(err) {
            logger.debug(debugPrefix + err);
            callback(err, null);
        }
        else {
            callback(null, null);
        }
    });
};

RabbitStorage.prototype.updateInfo = function(userinfo, callback) {
    var debugPrefix = "[updateUser]";
    var self = this;
    self.innerVerifyUser(userinfo.name, userinfo.pwd, function(err, res) {
        if(err) {
            logger.debug(debugPrefix + "update failed");
            callback(err, null);
        }
        else {
            self.addUser(userinfo, callback);
        }
    });
};

RabbitStorage.prototype.modifyPwd = function(name, oldPwd, newPwd, callback) {
    var debugPrefix = "[modifyPwd]";
    var self = this;
    self.innerVerifyUser(name, oldPwd, function(err, res) {
        if(err) {
            logger.debug(debugPrefix + "failed");
            callback(err, null);
        }
        else {
            userinfo.pwd = newPwd;
            self.addUser(userinfo, callback);
        }
    });
};

exports.createRabbitStorage = function(options) {
    return new RabbitStorage(options);
};
