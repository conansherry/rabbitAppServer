var store = require("./rabbitStore.js");
var log4js = require("log4js")
var logger = log4js.getLogger("test_store.js");
var async = require("async");
var fs = require("fs");

//logger.setLevel('ERROR');

var s = store.createRabbitStore();
var date = new Date();
var num = "123";
logger.debug(num>124);
logger.debug(num<124);
num = num*2;
logger.debug(num);

async.series([function(cb){
    s.getNewsList(function(err, res) {
        if(err)
            logger.error(err);
        else
            logger.debug(res);
        logger.debug("finish get list");
        cb(err, res);
    });
},
function(cb){
    s.addNews([{id:1,title:"哈哈",thumbnail:2,type:0,content:"#女团1931来袭#海南媒体见面会正式开始啦[鼓掌][鼓掌][鼓掌]媒体朋友和妹子们问答得好欢乐[偷笑]海南的海风跟1931的妹纸一样甜美[微风]感谢媒体朋友和粉丝们嗒支持[心]",time:date.getTime(),pics:"23,22,25,33"}, {title:"你好",thumbnail:2,type:0,content:"大家好，我是黄艺林-菟籽琳",time:date.getTime(),pics:"23,22,25,33"}], function(err, res){
        if(err)
            logger.error(err);
        else
            logger.debug(res);
        s.getNewsList(function(err, res) {
            if(err)
                logger.error(err);
            else
                logger.debug(res);
            logger.debug("finish add news and get list");
            cb(err, res);
        });
    });
},
function(cb) {
    logger.debug("start addImages");
    s.addImages(["1","2"],function(err, res){
        logger.debug(res);
        cb(err, res);
    });
},
function(cb) {
    s.getNews([1,2,3],function(err, res) {
        logger.debug(res);
        cb(err, res);
    })
},
function(cb) {
    s.getImages([1,2,3],function(err, res) {
        logger.debug("GET IMAGE ########### "+res.length);
        cb(err, res);
    })
},
],function(err, res){});
