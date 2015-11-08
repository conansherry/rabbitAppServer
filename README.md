# rabbitAppServer
rabbitApp Server

## 依赖
* redis
* mysql

## 配置
* 测试环境`config/test.json`
* 线上环境`config/production.json`

## 启动
```bash
export NODE_ENV=production # 由config目录下的json文件名决定
pm2 start rabbitServer.js
pm2 start dataSpider/spider.js
```
