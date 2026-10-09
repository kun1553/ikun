---
title: Redis 用在项目里之后，我才知道缓存不是加个 get 就完事
date: 2025-12-29
tags: [Redis, 后端, 缓存]
summary: 从数据结构选型到缓存三大问题、分布式锁的正确姿势与内存淘汰，记录把 Redis 真正用进项目后补上的那些认知。
featured: false
---

## 一开始我以为 Redis 就是个大 Map

刚学 Redis 的时候，我的用法只有一个：`opsForValue().set(key, value)`，然后 `get` 出来。它在我眼里就是个能设过期时间的 HashMap。

真正用它撑起一个功能之后才发现，麻烦根本不在「怎么存」，而在「存什么结构、什么时候失效、并发下谁来重建」。这篇把补上的认知记一下。

## 先选对数据结构

同一个需求，选错结构会让代码又臭又慢。我后来大致按这个标准选：

| 场景 | 结构 | 原因 |
| --- | --- | --- |
| 登录 token | Hash | 一个 token 对应多个字段（id、昵称、头像），可以单独改某个字段 |
| 点赞 / 一人一单 | Set | 天然去重，`SADD` 返回 0 就说明已经点过 |
| 排行榜、关注流 | ZSet | 按 score 排序，`ZREVRANGE` 直接取前 N |
| 验证码、计数器 | String | 简单值 + `INCR` 原子自增 |
| 签到 | BitMap | 一人一月一个 key，一天一位，统计连续签到用 `BITCOUNT` / `BITFIELD` |
| UV 统计 | HyperLogLog | 上亿基数只占 12KB，代价是约 0.81% 误差 |
| 附近商户 | GEO | 底层就是 ZSet，直接按距离查 |

举一个我改过的例子。最初我用 String 存登录用户，把整个对象序列化成 JSON：

```java
// 改字段要把整个对象读出来改完再写回去
String json = redis.opsForValue().get("login:token:" + token);
UserDTO user = JSONUtil.toBean(json, UserDTO.class);
user.setIcon(newIcon);
redis.opsForValue().set("login:token:" + token, JSONUtil.toJsonStr(user));
```

换成 Hash 之后，更新头像就是 `HSET key icon xxx`，不用读整个对象，也不会有并发覆盖的问题。

## 缓存的三个经典问题，和它们真正的解法

**穿透**：查一个数据库里根本不存在的 id，缓存永远不命中，请求全部打到库上。

解法是缓存空值，但**必须给空值设一个短过期时间**，否则如果这个 id 后来真的有数据了，缓存里的空值会一直骗人。2 分钟是个常用的折中。

```java
if (shop == null) {
    // 缓存空字符串标记，短 TTL
    redis.opsForValue().set(key, "", 2, TimeUnit.MINUTES);
    return null;
}
```

有个细节很容易漏：读缓存时要用 `isNotBlank` 判断「真数据」，用 `!= null` 判断「空值标记」。因为空标记存的是 `""`，`isNotBlank("")` 是 false，如果判断顺序写反了，逻辑就散了。

**击穿**：某个热点 key 恰好过期，大量请求同时去查库重建。

两种思路。互斥锁是「只放一个线程进去查库，其他线程等着」，简单但会阻塞；逻辑过期是「缓存永不物理过期，过期时间存在 value 里，发现逻辑过期就返回旧值 + 开个异步线程去重建」。后者不阻塞任何请求，代价是有一小段时间返回旧数据。

逻辑过期是我写过的最绕的一段代码，几个关键点：

```java
// 1. 缓存里存的是包装对象，包含数据本身和逻辑过期时间
RedisData redisData = JSONUtil.toBean(json, RedisData.class);
// 2. 未过期直接返回；已过期也先把旧值返回给用户
if (redisData.getExpireTime().isAfter(LocalDateTime.now())) {
    return data;
}
// 3. 只有抢到锁的线程去重建，且必须再检查一次，避免重复重建
if (tryLock(lockKey)) {
    CACHE_REBUILD_EXECUTOR.submit(() -> {
        try {
            // double check：可能别的线程刚重建完
            saveToRedis(id);
        } finally {
            unlock(lockKey);
        }
    });
}
return data; // 旧值照常返回
```

这里用线程池而不是 `new Thread()` 很重要——热点 key 一旦被反复触发，每次 new 一个线程迟早会把服务拖垮。

**雪崩**：大批 key 同时失效，或者 Redis 整个挂掉。

前者的解法是给过期时间加随机抖动：

```java
long ttl = 1800 + RandomUtil.randomLong(0, 300); // 30 分钟 ± 5 分钟
```

后者靠的是缓存降级（Redis 不可用时直接查库 + 限流）和多级缓存，不是单靠 Redis 能解决的。

## 分布式锁：SETNX 只是第一步

我最早写出来的锁是这样的：

```java
// 错误示范：两步不是原子的
Boolean ok = redis.opsForValue().setIfAbsent(key, "1");
redis.expire(key, 10, TimeUnit.SECONDS);
```

如果第一句执行完服务就挂了，这把锁永远不会被释放，后面所有人都拿不到。

正确写法是一条命令搞定，对应 Redis 的 `SET key value NX EX 10`：

```java
Boolean ok = redis.opsForValue()
        .setIfAbsent(key, "1", 10, TimeUnit.SECONDS);
```

第二个坑是释放锁。如果直接 `delete(key)`，会出现这种情况：线程 A 的业务执行超过了 10 秒，锁自动过期；线程 B 拿到锁；A 执行完把 key 删了——等于删掉了 B 的锁。所以释放时必须校验这把锁是不是自己的，而且「判断 + 删除」也得是原子的：

```lua
-- 用 Lua 保证原子性：值匹配才删
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
else
    return 0
end
```

再往后就是 Redisson 了。它做了可重入（用 Hash 存「哪个线程持有 + 重入次数」）、看门狗自动续期（默认 30 秒租期、每 10 秒续一次，业务没执行完锁不会过期），以及 RedLock。自己手写能用，但生产环境我直接用 Redisson。

## 过期、淘汰和那些会把自己搞挂的命令

- **过期删除**：Redis 用的是「惰性删除 + 定期删除」。所以一个过期了的 key 不保证立刻消失，`DBSIZE` 里可能还看得到它。
- **内存淘汰**：`maxmemory` 一定要配。不配的话，内存写满时 Redis 会直接返回错误甚至被系统 OOM Killer 杀掉。淘汰策略我用得最多的是 `allkeys-lru`（纯缓存场景）和 `volatile-lru`（有部分 key 必须长期保留时）。
- **`keys *` 是生产事故**：它是 O(N) 且会阻塞整个单线程。要用 `scan` 渐进式遍历。
- **大 key**：几 MB 的 Hash 或 List，删除时会阻塞、网络传输也疼。我后来养成习惯，写缓存前先看一眼序列化后的大小。
- **`MULTI` 事务不回滚**：Redis 的事务只保证「一起执行、中间不被插队」，某条命令失败了，其他命令照样生效。要真正的原子性还是得用 Lua。

## 持久化怎么选

- **RDB**：定时快照，文件小、恢复快，缺点是两次快照之间的数据会丢。
- **AOF**：记录每条写命令，`appendfsync everysec` 下最多丢 1 秒数据，代价是文件更大、恢复更慢。

我的项目里是缓存场景，丢了能重建，所以用 RDB 就够。但如果 Redis 里放的是「丢了就没了」的数据（比如队列消息），那就必须开 AOF，而且最好 `everysec` 起步。**这里有个认知转变：一旦 Redis 承担了唯一数据源的角色，它就不再是缓存，可用性和持久化的要求完全是另一个量级。**

## 小结

回头看我最初那句「Redis 就是个大 Map」，问题不在轻视工具，而在于当时我没意识到：**缓存的难点从来不是读和写，而是失效和并发。**

加一行 `get` 谁都会，难的是缓存脏了怎么办、热点 key 过期瞬间会发生什么、锁到底有没有真的锁住。这些问题只有在真实并发下才会暴露，也只有在踩过之后才会变成条件反射。

（同一批踩坑里，缓存与数据库双写不一致、下单幂等那部分，我记在《课程项目复盘》那篇里了。）
