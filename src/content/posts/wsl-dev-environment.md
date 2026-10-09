---
title: Windows 下的开发环境：WSL2 + Docker 折腾记
date: 2025-11-27
tags: [工具链, WSL, Docker]
summary: 从虚拟化没开、跨盘访问慢到镜像加速，记录 WSL2 与 Docker 集成过程中踩过的坑和 compose 配置。
featured: false
---

## 为什么最后还是回到 WSL2

大二的时候我在 Windows 上装 MySQL，装完服务起不来，改个配置文件又要重启服务，配环境变量、找 my.ini 的位置，一晚上就过去了。后来换虚拟机，又嫌它重。真正让我下决心的是 Docker：Windows 上的容器方案最终还是要落到 WSL2 上，绕不过去。

现在的日常是：Windows 负责浏览器和写文档，代码、终端、数据库全部在 WSL2 的 Ubuntu 里，用 VS Code 的 Remote - WSL 插件连过去。

## 坑一：虚拟化没开

装完 WSL，第一次启动发行版就报错：

```text
WslRegisterDistribution failed with error: 0x80370102
Please enable the Virtual Machine Platform Windows feature and ensure
virtualization is enabled in the BIOS.
```

报错信息其实说得挺清楚，但「在 BIOS 里开启虚拟化」需要重启进 BIOS，我一开始不太想动。最后还是重启打开了 SVM（AMD 平台叫 SVM，Intel 平台叫 VT-x），回来再执行：

```text
wsl --install -d Ubuntu
```

顺手记几个常用命令：`wsl --status` 看默认发行版和 WSL 版本，`wsl --list --verbose` 看各个发行版的状态，`wsl --update` 升级内核。

## 坑二：网络与镜像模式

我有「从 Windows 侧访问 WSL 里的服务」这个需求。WSL2 默认是 NAT 模式，Windows 访问 WSL 里的服务没问题，但反过来经常要去翻 `/etc/resolv.conf` 找网关 IP，重启一次地址还可能变。后来在 `%UserProfile%\.wslconfig` 里打开了镜像模式：

```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
networkingMode=mirrored
```

镜像模式下 WSL 和 Windows 共享网络命名空间，两边 `localhost` 互通，省掉了找 IP 的麻烦。内存和 CPU 上限也建议设一下，否则 WSL2 对应的 vmmem 进程会慢慢把主机内存吃满——我第一次在 WSL 里跑前端构建时，主机卡到鼠标都不太能动。

## 坑三：跨盘访问慢得离谱

这个坑最隐蔽。我一开始把代码放在 `D:\workspace\...`，然后从 WSL 里用 `/mnt/d/workspace/...` 访问。一个小项目 `npm install` 要八九分钟，连 `git status` 都要好几秒，我一直以为是网络或者 npm 源的问题。

后来把同一个项目复制到 WSL 的 `~/code/` 下再跑一次，对比很直接：

```text
/mnt/d/workspace/blog   npm install   8m12s
~/code/blog             npm install   1m31s
```

差了五倍多。原因是跨文件系统访问要经过 9P 协议转发，每个小文件的元数据操作都要跨一次边界，而 node_modules 恰好是几十万个小文件。

所以现在的原则很简单：源码、依赖、Git 仓库都放 Linux 侧（`~/code`），Windows 只作为编辑器前端，通过 VS Code Remote 连过去。确实需要用 Windows 上的工具处理的文件，再单独拷到 `/mnt/d` 下面。

## Docker Desktop 与 WSL 集成

安装 Docker Desktop 时向导会自动配置 WSL 集成，但要确认 Settings → Resources → WSL Integration 里对应发行版的开关是打开的。打开之后，WSL 里的 `docker` 和 `docker compose` 命令可以直接用，不需要再在 Linux 侧装一份 Docker Engine——两边都装最容易出现的情况是，Windows 上 `docker ps` 里有容器，WSL 里却看不见，排查起来很费时间。

镜像加速的配置位置取决于你用哪种方式。Docker Desktop 在 Settings → Docker Engine 里改 JSON；原生 Docker Engine 则是编辑 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": ["https://<你的阿里云个人加速地址>.mirror.aliyuncs.com"]
}
```

改完 `sudo systemctl restart docker`，再用 `docker info` 在输出的最后能看到生效的 Registry Mirrors 列表。网上流传的很多公共镜像站现在要么限速要么已经下线，用云厂商分配给个人的地址会稳定一些——我第一次拉 MySQL 镜像卡在 30% 不动，换了地址之后两分钟就拉完了。

## 用 compose 一键起中间件

课程项目里我最烦的就是换台机器重装 MySQL。后来写了个 compose 文件，`docker compose up -d` 就能把依赖起起来：

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: trade-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root123456
      MYSQL_DATABASE: campus_trade
      TZ: Asia/Shanghai
    ports:
      - "3306:3306"
    volumes:
      - ./data/mysql:/var/lib/mysql
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  redis:
    image: redis:7-alpine
    container_name: trade-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - ./data/redis:/data
```

有几个具体的点值得说。`utf8mb4` 一定要在启动参数里指定，否则中文和 emoji 会出问题；`./data/mysql` 挂载出来之后删容器不丢数据，但也意味着改了 root 密码之后要手动清理这个目录才能生效；如果应用服务也放进 compose，`depends_on` 只能保证启动顺序，不能保证 MySQL 已经初始化完成，稳妥的做法是加健康检查配合 `condition: service_healthy`。

折腾这些花的时间不算少，但换来的是一套可以随时删掉重建的环境。对做课程项目的人来说，这比记住「怎么装 MySQL」有用得多。
