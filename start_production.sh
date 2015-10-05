#!/bin/sh

export NODE_ENV=production
forever start dataSpider/spider.js
forever start rabbitServer.js
