# 一指逃生

竖屏小游戏。点一下换边，躲开不断收窄的墙壁，把分数发给好友比一比。每天的关卡相同，橙色墙壁表示这一下不用换边。

## 本地打开

在项目根目录执行：

```bash
npx --yes serve public -l 8765
```

浏览器打开 http://localhost:8765 。手机可用同一局域网地址访问。

## 部署到 Cloudflare Pages

```bash
npx wrangler login
npx wrangler pages deploy public --project-name one-tap-escape
```

线上地址会在部署成功后出现在命令输出里。

## 分享

结算页可以再来一局、复制挑战链接，或生成 9:16 战绩图。好友打开 `/?c=分数&d=日期` 会玩到同一关，并看到要超过的分数。
