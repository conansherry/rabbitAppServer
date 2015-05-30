var request = require("request");

request.get("http://t.cn/R2t16Ol", function (err, res, body) {
    console.log(res);
    console.log(body);
});
