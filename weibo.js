var weibo = require("weibo");

var appkey = '1345109430';
var secret = '75dbbfb52aaa6fa6f6960976c890b77b';
var oauth_callback_url = 'https://api.weibo.com/2/statuses/user_timeline.json';
weibo.init('weibo', appkey, secret, oauth_callback_url);

var user = { blogtype: 'weibo' };
var cursor = {count: 20, source:appkey, access_token:'2.00bi5d7B56wBTB2886df6b960nnJpo'};
weibo.user_timeline(user, cursor, function (err, statuses) {
  if (err) {
      console.error(err);
    } else {
        console.log(statuses);
      }
});
