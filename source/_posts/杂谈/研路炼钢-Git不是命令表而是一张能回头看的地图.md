---
title: "我把 Git 命令跑了一遍，才明白它为什么能救场"
date: 2026-09-27 14:04:11
tags:
  - Git
  - 开发工具
  - 踩坑记录
  - 研路炼钢
categories:
  - 杂谈
cover: /img/git-from-zero-to-practice/00_cover.png
abbrlink: git-from-zero-to-practice
description: "从一次改错分支名开始，重新梳理暂存区、分支、合并与撤销。把日常操作分成五步：先看状态，再核对改动与历史，最后处理远程同步。"
topic: "工程与部署"
---

![封面：Git 记录每一步，也给改错留一条路](/img/git-from-zero-to-practice/00_cover.png)

> 学 Git 时，我最缺的不是一张命令速查表，而是每次敲命令前都能回答：我现在在哪个分支，改动在哪一层，接下来会动哪段历史？

这次我在 Windows 的 `E:\demo` 里，从 `git init` 一直练到分支合并、冲突、变基和推送。练习仓库也同步到了 GitHub。原本以为自己需要记住更多命令，结果最深的一次印象，来自一个只有三个字母的参数：`-M`。

我本想把 `master` 改名为 `main`，却忘了自己已经切到 `test2`。`git branch -M main` 执行得很干脆：**被改名的是当前分支 `test2`。** Git 没有猜错，是我没看自己站在哪。

这次练习让我重新理解 Git：它不只是“保存代码”，更像一张能看见改动位置、协作方向和撤销边界的地图。

---

## 01｜先认清三个区，再谈提交

![工作区、暂存区与提交历史的关系](/img/git-from-zero-to-practice/01_three-areas.png)

我以前把 `git add` 和 `git commit` 当成一套连招，后来才明白，中间多出来的暂存区，是 Git 最贴心的一层设计。

```text
工作区（正在改） → git add → 暂存区（这次选哪些） → git commit → 本地历史（形成记录）
```

假设我同时改了首页、说明文档和一份还没写完的实验记录。这次只想提交首页与说明文档，就只把这两个文件放进暂存区。**一次提交应该表达一个清楚的改动，而不是把今天碰过的文件全打包。**

```bash
git status                 # 先看现在有什么改动
git diff                   # 看还没暂存的内容
git add index.html README.md
git diff --cached          # 看这次准备提交什么
git commit -m "完善首页与使用说明"
git log --oneline          # 看刚形成的提交
```

Git 的提交可以理解成项目状态的一张快照；内部为了节省空间也会使用压缩和差量存储。对日常使用来说，重要的是：**提交之后，能明确找到当时的版本。**

## 02｜分支不是文件副本，合并先看站位

![两条分支从同一提交分开并重新汇合](/img/git-from-zero-to-practice/02_branch-merge.png)

分支可以先理解成一个指向提交的名字，`HEAD` 则告诉我当前站在哪个分支上。创建实验分支，不是复制出一套互不相关的项目；两边仍共享分叉以前的历史。

```bash
git switch -c test     # 从当前位置创建并切换到 test
git branch             # 星号标出当前分支
git switch master      # 回到要接收改动的分支
git merge test         # 把 test 的改动合进当前分支
```

**合并有方向。** 我站在 `master` 上执行 `git merge test`，前进的是 `master`。如果 `master` 之后没有新提交，Git 通常只需“快进”指针，不会额外生成合并提交；两边已经各自前进时，才通常需要把两条历史汇合成一个新的合并提交。[Git 官方文档](https://git-scm.com/docs/git-merge)把这两种情况分得很清楚。

我还练到了冲突。两边对同一处内容给出互不兼容的修改，Git 不能替我做判断，就会在文件里留下冲突标记。我需要先读懂两边意图，改成最终版本，再执行：

```bash
git status
git add index.html
git commit             # 完成这次有冲突的合并
```

如果决定不合了，可以在合并过程中用 `git merge --abort`。这里真正需要记住的不是标记长什么样，而是：**冲突不是 Git 坏了，是它把决策权交还给我。**

## 03｜merge 接上历史，rebase 重放历史

![合并保留分叉，变基重放提交](/img/git-from-zero-to-practice/03_merge-rebase.png)

练到 `rebase` 时，我第一次看到“内容看起来一样，提交编号却变了”。原因是它会把分支上的提交拿到新的基点上重新应用。旧提交和新提交不再是同一个对象，所以哈希也会变化。

```bash
git switch test
git rebase master
```

`merge` 适合保留两条线如何汇合；`rebase` 适合在个人分支上整理尚未共享的提交，让阅读历史更直。它们不是“高级版”和“低级版”的关系，而是两种不同的历史表达。

变基遇到冲突时，我要改好文件、`git add`，再执行 `git rebase --continue`；想撤销这次操作，用 `git rebase --abort`。**不要把解决变基冲突的下一步机械地写成 `git commit`。**

我给自己的边界是：已经推送、又可能被别人基于它继续工作的提交，不轻易改写。Git 官方的[变基章节](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)也特别提醒了共享历史被改写后的协作成本。

## 04｜后悔药先分类：还没提交、已经提交、已经推送

![按改动是否提交和推送选择撤销方式](/img/git-from-zero-to-practice/04_undo-map.png)

Git 最让我安心，也最让我紧张的，是它的“后悔药”很多。不能一看见改错，就直接复制一条 `reset --hard`。

如果只是把文件放错了暂存区，先看 `git status`，再用 `git restore --staged 文件名` 撤下暂存。如果改到一半需要临时切走，可以用 `git stash push -m "未完成的改动"` 暂存现场，回来后用 `git stash list` 和 `git stash pop` 找回。

如果**最近一次提交还没共享**，`reset` 才适合进入讨论：

| 命令 | 提交指针 | 暂存区 | 工作区 |
|---|---|---|---|
| `git reset --soft HEAD~1` | 后退一格 | 保留 | 保留 |
| `git reset --mixed HEAD~1` | 后退一格 | 撤下暂存 | 保留 |
| `git reset --hard HEAD~1` | 后退一格 | 对齐旧提交 | 对齐旧提交 |

`--hard` 会覆盖已跟踪文件的未提交改动，还可能覆盖挡路的未跟踪文件。**提交过的历史有时能借助 `reflog` 找回；从没提交过的改动则不能指望它救。** 所以我不把 `--hard` 当日常清理按钮。[官方 `reset` 文档](https://git-scm.com/docs/git-reset)列出了三种模式的准确行为。

如果错误提交已经推送给别人，通常用 `git revert 提交号` 生成一条反向提交，保留大家正在共同使用的历史。改提交信息或补进遗漏文件时，`git commit --amend` 很方便，但它也会改写最近一次提交；同样要先确认有没有共享。

## 05｜推到 GitHub，才知道本地与远程是两本账

![本地分支、远程跟踪分支与 GitHub 的同步关系](/img/git-from-zero-to-practice/05_remote.png)

我在 `E:\demo` 里改完文件，并不等于 GitHub 已经有了。`commit` 只写进本地仓库，`push` 才把相应提交送到远程。第一次推新分支时，`-u` 会顺手建立上游关联：

```bash
git remote -v
git push -u origin main
git branch -vv
```

远程变了，也不意味着我的工作区会自动变化。`git fetch` 先更新我对远程状态的认识；随后我可以比较 `main` 和 `origin/main`，再决定怎么整合。

```bash
git fetch origin
git log --oneline main..origin/main
git status
```

`git pull` 会先获取远程更新，再按命令参数或配置整合到当前分支：可能快进，也可能合并或变基。因此我不会把它死记成永远的“`fetch + merge`”。[Git 官方 `pull` 文档](https://git-scm.com/docs/git-pull)列出了这些方式。

练习时我也遇到过 `non-fast-forward`。这通常意味着远程有我本地没有的提交，Git 拒绝直接覆盖它。我会先 `fetch` 看差异，确认自己的分支和上游关系，再决定如何整合。`--force-with-lease` 仍然是在改写远程历史，不能当成普通重试；有别人协作的分支，更不能随手强推。

## 06｜这几个坑，根子都是我没先看状态

![操作前依次检查分支、改动和远程差异](/img/git-from-zero-to-practice/06_pitfalls.png)

回头看这次练习，几个坑其实有同一个根源。

第一，在两个终端里操作同一个 `E:\demo` 仓库，一个终端切了分支，另一个终端并不会留在旧分支。两个窗口共享同一份仓库状态。执行 `reset` 前如果只凭记忆，动到的就可能不是我以为的那条线。

第二，`git branch -M main` 修改的是**当前分支**的名字。我那时站在 `test2`，于是改名的也是 `test2`。从那以后，涉及分支改名、合并、重置，我都先跑一次 `git status` 或 `git branch --show-current`。

第三，工作区有未提交改动时，切换分支可能被 Git 拦住，提示改动会被覆盖。这不是报错来添乱，而是在阻止我丢掉现场。先提交、暂存，或者把当前改动处理清楚，再继续切换。

它们让我多出一个固定动作：**命令记不全可以查，当前状态不能靠猜。**

## 写在最后｜把这五步贴在终端旁边

![操作 Git 前先看状态，改完再核对提交与远程](/img/git-from-zero-to-practice/99_final.png)

现在我给自己留的速查表，只有五步：

1. `git status`：当前在哪、哪些文件被改过？
2. `git diff` 与 `git diff --cached`：这次到底要提交什么？
3. `git branch --show-current`：合并、变基、重置会作用在哪条线？
4. `git log --oneline --all --graph`：历史已经走到哪里？
5. `git fetch` 后再比较：远程有没有新的提交？

做完再检查一遍 `git status`，确认工作区与分支状态符合预期。需要推送时，再执行 `git push`。

这次从零练 Git，我真正记住的不是几十条命令，而是一个顺序：**先看状态，再动历史；先确认影响范围，再按回车。**

---

*研路炼钢，记录一个计算机研究生的真实成长。*
