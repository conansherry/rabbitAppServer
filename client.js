var request = require('request');
request('https://api.weibo.com/2/statuses/home_timeline.json?access_token=2.00TMKtHGJyWsQCe8ae180c5btvz2PB', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // 打印google首页
  }
})
