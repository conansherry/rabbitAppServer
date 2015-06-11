# rabbitAppServer
rabbitApp Server

## 配置
* 测试环境`config/default.json`
* 线上环境`config/production.json`

## 启动
```bash
export NODE_ENV=production # 由config目录下的json文件名决定
forever rabbitServer.js
```
