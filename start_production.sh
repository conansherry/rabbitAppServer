#!/bin/sh

export NODE_ENV=production
pm2 start dataSpider/spider.js
pm2 start rabbitServer.js
