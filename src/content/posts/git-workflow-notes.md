---
title: Git 工作流踩坑记录
date: 2025-11-15
tags: [Git, 工程化]
summary: rebase 与 merge 的选择，用 reflog 救回误删分支，以及 reset 和忽略文件规则踩过的坑。
featured: false
---

## rebase 和 merge 到底怎么选

这两个命令我用了很久才形成稳定的习惯，规则很简单：只在自己一个人的功能分支上 rebase，任何被别人拉取过的分支一律 merge。

`merge` 会保留真实的分支拓扑，多一条合并提交，历史看起来像一张网；`rebase` 把当前分支的提交依次「搬」到目标分支最新提交之后，历史是一条直线，但提交哈希全变了。哈希变了就意味着，如果有人基于你 rebase 之前的提交做了工作，他那边的历史会彻底错乱。所以 main、develop 这类公共分支上永远不要 rebase。

我平时的操作是功能分支提交前同步主干：

```bash
git fetch origin
git rebase origin/main
# 有冲突就解决，然后
git add .
git rebase --continue
```

如果 rebase 到一半发现搞错了，`git rebase --abort` 可以完整退回去，这一点比很多人想象的宽容。

## 用 reflog 救回一个被删掉的分支

真实经历：我整理本地分支时执行了 `git branch -D feature/order`，几秒之后才想起来，这个分支还没合并，里面有一整个下午写的库存扣减逻辑。当时的恐慌程度我到现在都记得。

好在 Git 不会立刻删除对象，reflog 记录了 HEAD 的每一次移动：

```bash
$ git reflog
d4b2e11 HEAD@{0}: checkout: moving from feature/order to main
9a7c3f2 HEAD@{1}: commit: feat: 库存扣减加乐观锁重试
1f0b88a HEAD@{2}: commit: feat: 下单接口幂等令牌
```

找到 `feature/order` 上的最后一个提交 `9a7c3f2`，把它接回一个新分支：

```bash
git branch feature/order-rescued 9a7c3f2
git switch feature/order-rescued
git log --oneline -3
```

代码全回来了。reflog 默认保留 90 天，未被引用的对象在 `gc` 触发前也不会被清掉，所以误删分支之后第一件事是别再乱敲命令，先看 reflog。

## reset --hard 的惨案

第二个教训更疼。有一次我发现上一个提交里混进了一个不该提交的文件，为了「干净」，直接执行：

```bash
git reset --hard HEAD~1
```

然后才想起来，除了那个提交，工作区里还有一整天没提交的改动，全没了。`reset --hard` 会同时重置暂存区和工作区，而未提交的内容不在 Git 的对象库里，reflog 也救不了。

最后是 IDE 的 Local History 帮我找回了大部分文件（文件上右键，Local History，Show History）。从那以后我改了两件事：一是不管写没写完，只要到一个能编译的状态就 commit 一次，哪怕消息只写 `wip`；二是非要用 `reset --hard` 之前，先 `git stash -u` 把未跟踪的文件也一起存起来。

顺便把 `reset` 的三个模式说清楚：`--soft` 只动 HEAD，改动留在暂存区；`--mixed`（默认）动 HEAD 和暂存区，改动留在工作区；`--hard` 三个全动，工作区内容直接丢。前两个基本都能救回来，第三个不能。

## .gitignore 对已跟踪文件无效

这个坑几乎每个人都会踩：项目初始化时第一次提交把 `.idea/`、`target/`、`*.log` 全提交上去了，之后才想起来加 `.gitignore`，加完发现没反应。

原因是 `.gitignore` 只对**未跟踪**的文件生效，已经进入索引的文件不会因为规则变化就自动消失。正确做法是先把它从索引里删掉，但保留磁盘上的文件：

```bash
git rm -r --cached .idea
git rm --cached application-local.yml
git commit -m "chore: 停止跟踪 IDE 配置和本地配置文件"
```

这里有个必须注意的点：`rm --cached` 只影响之后的提交，历史里那个文件的内容仍在。我那个 `application-local.yml` 里写过数据库密码，光删索引是不够的，最后是把密码改掉、再用 `git filter-repo` 重写历史才算处理干净。所以更重要的教训是，密钥必须在第一次提交之前就挡在外面。

## 改最后一次提交

`commit --amend` 我几乎每天都在用，最常见的场景是提交信息写错了，或者漏了一个文件：

```bash
git add src/main/java/com/example/order/StockServiceImpl.java
git commit --amend -m "fix: 修复库存扣减的事务失效问题"
```

不加 `-m` 会打开编辑器让你改信息。需要注意：`amend` 生成的是一个全新的提交，哈希变了。如果这个提交已经推到远程，就必须强推，而且一定要用带保护的版本：

```bash
git push --force-with-lease origin feature/order
```

`--force-with-lease` 会在远程分支被别人更新过时拒绝推送，而 `--force` 会直接把别人的提交冲掉。这个区别在多人协作里可能意味着一整天的工作，我现在已经养成不碰 `--force` 的习惯了。
