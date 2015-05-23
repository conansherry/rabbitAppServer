var request = require("request");

request.get("http://ww3.sinaimg.cn/thumbnail/7367810bjw1esb3u8p27gj20c50flte5.jpg", function (err, res, body) {
    console.log(err);
});
