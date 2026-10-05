# Leo 的笔记本

基于 Hexo 7.3 和 Butterfly 5.5.4 的静态博客，地址为 <https://insistgang.top>。

## 文件在哪里

- `source/_posts/`：文章与脱敏日记。
- `source/img/`：文章图片；保持现有文件名可避免旧链接失效。
- `source/img/cover-thumbnails/`：列表页使用的轻量封面，正文继续引用原图片路径。
- `source/lmcc/`：独立的 LMCC 练习页面与学习资料。
- `_config.yml`：站点与部署配置。
- `_config.butterfly.yml`：主题、搜索、图片放大与导航配置。
- `public/`、`db.json`：本地构建产物，不纳入 Git。

## 什么时候同步和发布

保存文件只会更新本地。`git commit` 保存本地版本；`git push origin hexo` 才会同步源码到 GitHub，并触发自动部署。

自动部署按顺序执行：安装依赖 → 测试 → 构建 → 资源检查 → 发布到 `insistgang.github.io` 仓库的 `master` 分支。全部成功后，网站才会更新。进度可在 [GitHub Actions](https://github.com/insistgang/hexo/actions/workflows/deploy.yml) 查看。

开始编辑前可用 `git fetch origin` 检查远端，再用 `git status -sb` 查看分支差异。需要拉取时使用 `git pull --ff-only`；若存在本地改动或分支分叉，先处理差异。

## 本地预览与检查

```sh
npm ci
npm run server
```

发布前检查：

```sh
npm test
npm run build
npm run audit
```

首选推送 `hexo` 分支，让 GitHub Actions 发布。需要手动发布时，可运行 `npm run deploy` 或 `bash deploy.sh`，两者都会先执行测试、构建和资源检查，失败即停止。手动部署只发布网站，不会提交或推送源码。

## 文章和图片约定

- `date` 使用固定日期，例如 `2026-04-20T13:47:50+08:00`。不要把 `$(date ...)` 等命令文本写进日期字段。
- 日记须保持 `published: false` 并先脱敏。该字段控制网站生成；源码仓库当前公开，已提交的日记文件仍可从 GitHub 访问。
- 大图上传前先保留项目外的原图备份，再按网页阅读尺寸压缩；避免将备份放进 `source/`，否则会随网站发布。
- 当前主题使用 `search.use: local_search` 和 `lightbox: fancybox`；旧版的 `local_search.enable`、`fancybox: true` 不再控制这些功能。

## 内容与阅读入口

公开文章需填写 `description`（25–180 字符，推荐约 50–100 字）与 `topic`。首页直接使用摘要，专题阅读页按 `topic` 自动整理文章；旧分类和文章地址继续保留。

`topic` 可选：`AI工具与实践`、`工程与部署`、`科研与写作`、`成长与选择`、`阅读与生活`、`备考资料`。栏目说明在 `source/_data/editorial.json`，入口为 `/reading/`。

摘要要说明具体问题与读者能得到的内容，不要把个人体感、转述经历和旧价格写成普遍结论。正文大改时也要检查摘要。Hexo 会渲染文章标题，正文无需再写一遍相同的一级标题。
