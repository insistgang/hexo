---
title: 从本地 Demo 到公网可用：路遥 AI 的低成本部署实录
date: 2026-08-08 18:10:00
tags:
  - AI部署
  - GitHub Actions
  - Render
  - Docker
  - 研路炼钢
categories:
  - 杂谈
cover: /img/luyao-ai-public-deployment/00_cover.webp
abbrlink: luyao-ai-public-deployment
---

![封面：从本地演示到公网可用的部署链路](/img/luyao-ai-public-deployment/00_cover.webp)

# 从本地 Demo 到公网可用：路遥 AI 的低成本部署实录

> 本地能跑，只证明代码在我的电脑上成立。真正把一个带后端、数据库和 API Key 的 AI 应用交给别人用，还要同时解决网络、部署、密钥、冷启动和数据持久化。

上一篇[《不是接一个 TTS：我如何把 61 秒视频重构成有记忆、有情绪的 AI 伴侣》](/posts/luyao-ai-emotional-companion.html)，我讲了路遥 AI 的多 Agent、声音复刻、多气泡、上下文和长期记忆。

代码重构完以后，我很快撞上了另一个问题：它在本地可以聊天、可以说话，也可以写入 ChromaDB，但我一关电脑，别人就完全用不了。

更麻烦的是，这不是一个纯前端网页。它需要 FastAPI 常驻运行，需要访问 MiniMax，需要保存 API Key，还要限制陌生人无限调用付费接口。把它传到 GitHub，不等于它已经上线；把端口暴露到公网，也不等于它可以安全分享。

这篇只复盘一件事：**我怎样用一套尽量低成本的方案，把本地 Demo 变成一个别人可以访问、密钥又不会落到浏览器里的在线应用。**

---

## 01｜本地能跑和别人能用，中间隔着两层应用

![浏览器界面与后端核心分成两层](/img/luyao-ai-public-deployment/01_two-layer-app.webp)

路遥 AI 里，FastAPI 和 Gradio 不是两个重复的 Web 框架，而是两层不同职责。

FastAPI 是真正的应用核心。它提供健康检查、聊天、流式聊天、语音和流式语音接口，`LuyaoService` 在这里编排 Guardrail、记忆、人设与异步提取器；Pydantic 负责输入输出校验，trace ID 和结构化日志负责定位一次请求。

```text
GET  /health
POST /api/chat
POST /api/chat/stream
POST /api/voice
POST /api/voice/stream
```

Gradio 只是设备交互原型。输入框、聊天气泡、音频播放器和浏览器状态都在这里，但它不复制 Prompt，也不直接请求 MiniMax，而是通过容器内部的 HTTP 调用 FastAPI。

部署时，我只把 Gradio 绑定到平台分配的公网端口，FastAPI 仍监听容器回环地址。这样浏览器拿到的是页面和返回结果，不会拿到 MiniMax API Key，也不能直接扫内部编排接口。

这个分层解决了一个很常见的误区：**界面可访问，不代表应用核心必须裸奔在公网。**

## 02｜一个容器、一套测试，先把每次提交变成可验证

![从代码提交到容器部署的自动验证链](/img/luyao-ai-public-deployment/02_container-ci.webp)

开发阶段，我保留了“逻辑多 Agent、部署单容器”的结构。Docker 镜像里同时包含 FastAPI、Gradio、ChromaDB 客户端和项目代码，启动脚本读取平台下发的 `PORT`，再把页面服务对外暴露。

一个容器不是为了省一个名词，而是减少不必要的部署变量。当前规模下，我不需要先处理五个服务之间的网络、队列和版本一致性，只要保证这一个镜像在本地和云端执行同一套启动逻辑。

代码进入 GitHub 后，Actions 在 `main` 更新时依次做三件事：

1. 安装锁定的依赖并生成不含真实密钥的测试配置；
2. 运行 Guardrail、记忆、接口和核心服务的单元测试；
3. 测试通过后，才允许静态入口与容器服务继续部署。

CI 不调用真实的付费聊天和语音接口。真实 voice ID、TTS 和模型连通性单独通过手动 live smoke test 验证，避免一次普通提交意外消耗额度。

我后来越来越重视这条顺序：

```text
提交代码 → 自动测试 → 构建容器 → 健康检查 → 替换线上版本
```

部署不是把“本地好像能跑”复制到云端，而是让每一次替换都先经过同一套证据。

## 03｜HTTP 402 不是代码 Bug，部署平台也会改变规则

![遇到 402 后保留容器并迁移运行平台](/img/luyao-ai-public-deployment/03_platform-migration.webp)

我最初选的是 Hugging Face Spaces。仓库、Secret、Docker 和自动部署工作流都接好了，但实际创建 Gradio/Docker Space 时返回了 HTTP 402。

这一次 402 的重点不是状态码本身，而是我差点继续沿着错误方向排查代码。

当时日志表达的是账户与计算资源方案受限，不是容器构建失败。Hugging Face 当前的[官方 Spaces 概览](https://huggingface.co/docs/hub/spaces-overview)也区分了静态 Space 与需要计算资源的 Gradio/Docker Space。平台政策会变，所以文章只记录这次项目当时遇到的实际结果，不把它写成永久规则。

确认问题在托管策略后，我没有重写应用，而是保留 Docker 架构，把运行平台迁到 Render。

根目录新增 `render.yaml`，声明 Docker Web Service、区域、健康检查和自动部署策略；`MINIMAX_API_KEY` 与访问密码使用 `sync: false`，首次创建 Blueprint 时再在控制台填写。Render 的[Blueprint 规范](https://render.com/docs/blueprint-spec)也明确建议不要把凭证硬编码进配置文件。

这次绕路给我的判断很直接：**容器真正的价值，不是显得工程化，而是平台变化时，我还能把应用整体搬走。**

## 04｜Pages 做门面，Render 跑后端，密钥留在服务器

![自定义域名、静态入口与后端服务的安全分层](/img/luyao-ai-public-deployment/04_public-entry-security.webp)

GitHub Pages 是静态站点托管服务，适合发布 HTML、CSS 和 JavaScript，也支持自定义域名；它不能常驻运行 FastAPI，更不应该保存 MiniMax API Key。[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)对它的定位本身就是静态站点。

所以我最后采用了两层入口：

- GitHub Pages 承载品牌页面与 `insistgang.top` 自定义域名；
- Pages 通过 iframe 嵌入 Render 上的 Gradio 应用；
- Render 容器运行 Gradio、FastAPI、ChromaDB 和 MiniMax 服务端调用；
- 仓库变量 `LUYAO_APP_URL` 只保存公开的 Render 地址；
- API Key 与访问密码只保存在服务端 Secret 中。

两个公开地址分别是：

- 品牌入口：<https://insistgang.top/Luyao_AI_Project/>
- Render 应用：<https://luyao-ai-project.onrender.com/>

公开托管还增加了 Gradio 登录保护。它不是正式账号系统，但至少能阻止任何路过的爬虫或访客直接消耗语音额度。密码同样不进仓库、不进页面，也不出现在文章截图里。

GitHub Actions 的[官方 Secret 文档](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)给了我一个很实用的检查标准：公开地址属于变量，凭证才属于 Secret；任何敏感值都不应该通过命令输出或构建日志泄露。

**入口可以公开，调用权不能跟着公开。**

## 写在最后｜免费上线不等于生产可用

![免费演示与正式产品之间的五项差距](/img/luyao-ai-public-deployment/05_production-boundary.webp)

到这里，地址已经能打开，但免费实例并不是 24 小时常驻服务。

Render 的[免费服务说明](https://render.com/docs/free)写得很清楚：Free Web Service 连续 15 分钟没有入站流量会休眠，下一次请求会重新拉起，过程大约需要 1 分钟。更关键的是，本地文件系统是临时的；休眠、重启或重新部署后，运行期间写入的本地文件会丢失。

这意味着当前 ChromaDB 能演示“记忆如何被写入和召回”，却不能承诺“你的记忆会一直保存”。免费部署解决了分享问题，没有解决长期托付问题。

要进入正式产品阶段，我至少还要补完这些能力：

1. 把长期记忆迁到外部数据库，或使用可持久化磁盘；
2. 为每位用户建立独立账号、user ID 和数据命名空间；
3. 把共享密码升级为正式鉴权、额度与速率限制；
4. 增加成本预算、监控、告警、审计与数据删除机制；
5. 使用语音时间戳或真正的上游音频流，替代当前近似同步；
6. 继续遵守声音授权边界，允许用户撤回和删除相关数据。

这次从本地 Demo 到公网，我最大的收获不是记住了几个平台按钮，而是学会把“上线”拆成几个不同问题：代码是否可运行，容器是否可迁移，提交是否可验证，页面是否可访问，密钥是否安全，数据是否能留下。

**部署成功只代表别人今天能打开；生产可用还意味着，明天重启之后，身份、记忆、成本和责任都还在。**

---

*研路炼钢，记录一个计算机研究生的真实成长。*
