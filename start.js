/**
 * @file start.js
 * @brief main
 * @author conansherry
 * @version 1.0
 * @date 2015-05-15
 */

var server = require("./server");
var router = require("./router");

server.start(router.route);
