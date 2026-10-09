---
title: 课程项目复盘：一个校园二手交易平台的得与失
date: 2025-11-03
tags: [Java, Spring Boot, 后端]
summary: 复盘校园二手交易平台，14 张表 47 个接口，重点记录事务失效、缓存双写不一致和下单幂等这三个坑。
featured: false
---

## 项目是什么

上学期我参与的课程项目是一个校园二手交易平台，也是我第一次把 Spring Boot 用到有真实规模的地方。一共 14 张表，Swagger 上统计 47 个接口，核心链路是「发布商品、浏览搜索、下单、卖家确认、完成」，另外做了收藏、留言和简单的后台审核。

技术栈是 Spring Boot 2.7 + MyBatis-Plus + Redis 7 + MySQL 8，登录用 JWT。下面这三个坑是印象最深的，全部是在演示前才暴露出来的。

## 坑一：事务失效，因为同类调用不走代理

下单逻辑要先扣库存、再插订单，我理所当然地在两个方法上都加了 `@Transactional`：

```java
@Service
public class OrderServiceImpl implements OrderService {

    @Override
    public void createOrder(OrderCreateDTO dto) {
        // 直接调自己的方法，这里的 this 是原始对象，不是代理对象
        this.deductStock(dto.getProductId(), dto.getQuantity());
        orderMapper.insert(buildOrder(dto));
    }

    @Transactional(rollbackFor = Exception.class)
    public void deductStock(Long productId, Integer quantity) {
        Product p = productMapper.selectById(productId);
        if (p.getStock() < quantity) {
            throw new BizException("库存不足");
        }
        productMapper.decreaseStock(productId, quantity);
    }
}
```

现象是：库存不足时抛了异常，接口返回 500，但订单已经插进去了，库存也没回滚。原因是我一直知道、但没真正体会过的那句话——Spring 的 `@Transactional` 靠 AOP 代理实现，`this.deductStock(...)` 走的是原始对象的方法调用，压根不经过代理，所以 `deductStock` 上是没有事务的。

修法有三种：拆到另一个 Bean、注入自身代理、或者开 `exposeProxy = true` 后用 `AopContext.currentProxy()`。我选了第一种，把库存操作挪进 `StockServiceImpl`：

```java
@Transactional(rollbackFor = Exception.class)
@Override
public void createOrder(OrderCreateDTO dto) {
    stockService.deduct(dto.getProductId(), dto.getQuantity()); // 跨 Bean，走代理
    orderMapper.insert(buildOrder(dto));
}
```

顺手还补了一件事：Spring 默认只在遇到 `RuntimeException` 和 `Error` 时回滚，我那个 `BizException` 恰好继承了 `RuntimeException` 才没出更大的问题。从那以后我所有的 `@Transactional` 都显式写 `rollbackFor = Exception.class`。

## 坑二：缓存与数据库双写不一致

热点商品列表我用 Redis 缓存 60 秒，更新时先改数据库再删缓存。压测时出现过一个诡异现象：某个商品的价格被改回了旧值，而且一直不恢复。

复盘出来的时序是这样的：

- 请求 A 发现缓存没命中，去数据库读到旧价格，还没来得及写缓存
- 请求 B 修改价格，更新数据库成功，删掉缓存
- 请求 A 这时才把它读到的旧价格写进缓存

接下来 60 秒里所有人看到的都是旧价格。这就是并发下「后写的旧值覆盖了刚删掉的缓存」。

简单场景下我用两个手段缓解：一是写完数据库后延迟几百毫秒再删一次缓存，也就是延迟双删；二是给过期时间加随机抖动，避免同一批 key 同时失效引起击穿。但要说彻底解决，得靠订阅 binlog 异步失效（比如 Canal），或者干脆接受短暂不一致、在读的时候用版本号校验。以课程项目的规模，延迟双删加短过期时间够用了，不过我很清楚这只是缓解。

## 坑三：接口不幂等，用户点两下就是两个订单

演示前一天，测试同学在手机上快速点了几下「立即购买」，生成了两条订单。我的第一反应是加前端按钮 loading 禁用，但这只是治标——网络重试、用户手动刷新、浏览器后退再提交，都能绕过它。

真正的修法是在服务端做幂等。我在下单前加了一个申请令牌的接口，用户进入确认页时先拿一个 token，提交时带上：

```java
String key = "order:token:" + token;
Boolean ok = redisTemplate.opsForValue()
        .setIfAbsent(key, "1", Duration.ofMinutes(5));
if (!Boolean.TRUE.equals(ok)) {
    throw new BizException("请勿重复提交");
}
```

`setIfAbsent` 对应 Redis 的 `SET key value NX EX`，是原子操作，只有一个请求能拿到令牌。除此之外我还给订单表加了 `uk_user_product_trade_no (user_id, product_id, trade_no)` 唯一索引兜底——应用层的判断总有并发窗口，数据库的唯一约束是最后一道防线。

## 得与失

项目最后演示效果不错，老师问的几个点也都答上来了。但真正的收获是知道了课堂代码和工程代码的差别在哪：课堂代码只要功能对，工程代码还要考虑调用没走代理、缓存会脏、用户会连点。这些坑光看八股文记不住，必须自己踩一次，半夜对着日志想明白，才会变成肌肉记忆。
