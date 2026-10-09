---
title: 一次慢查询排查：从 4.2 秒到 80 毫秒
date: 2025-10-19
tags: [MySQL, 后端, 数据库]
summary: 一次列表接口从 4.2 秒到 80 毫秒的排查记录，涉及全表扫描、最左前缀、隐式类型转换和覆盖索引。
featured: true
---

## 现象

上周课程项目的商品列表接口突然变慢，前端点进分类页要转四五秒。我在 Controller 里打时间戳，发现 SQL 自己就占了 4.2 秒。表里当时灌了 80 多万行压测数据，原 SQL 是这样：

```sql
SELECT id, title, price, cover_url
FROM product
WHERE status = 1 AND category_id = 12
ORDER BY created_at DESC
LIMIT 20;
```

## EXPLAIN 看到全表扫描

```sql
EXPLAIN SELECT id, title, price, cover_url FROM product
WHERE status = 1 AND category_id = 12
ORDER BY created_at DESC LIMIT 20;
```

```text
+----+------+---------------+------+---------+--------+----------+-----------------------------+
| id | type | possible_keys | key  | key_len | rows   | filtered | Extra                       |
+----+------+---------------+------+---------+--------+----------+-----------------------------+
|  1 | ALL  | idx_created   | NULL | NULL    | 812340 |   10.00  | Using where; Using filesort |
+----+------+---------------+------+---------+--------+----------+-----------------------------+
```

`type=ALL`、`key=NULL`、`rows=812340`，全表扫描加 filesort。可这张表上明明有一个联合索引 `idx_created_status_category (created_at, status, category_id)`，MySQL 却没用它。

## 坑一：联合索引顺序写反

建这个索引时我想的是「列表都要按时间倒序，那 created_at 当然放最左边」。问题在于查询条件里根本没有 `created_at` 的等值条件，联合索引的最左列用不上，后面两列也跟着用不上——这就是最左前缀原则。B+ 树是先按第一个键排序的，我没法跳过它直接按第二个键定位。

把顺序改成等值条件在前、排序列在后：

```sql
ALTER TABLE product ADD INDEX idx_status_category_created (status, category_id, created_at);
```

这样 `status = 1` 和 `category_id = 12` 两个等值条件能定位到一段连续区间，`created_at` 在这个区间里天然有序，`ORDER BY created_at DESC LIMIT 20` 可以直接顺着索引往回读 20 条就停。改完 EXPLAIN 变成：

```text
|  1 | ref  | idx_status_category_created | 8 | 1230 | Using index condition |
```

扫描行数从 81 万降到 1230，`Using filesort` 也消失了。这一步把 4.2 秒压到了 210 毫秒左右。

## 坑二：隐式类型转换让索引失效

排查时顺手看了另一个接口「查我发布的商品」：

```sql
SELECT id, title, price FROM product WHERE seller_id = 10086;
```

`seller_id` 是 `varchar(32)`，我在 Java 里习惯性地按数字传参。EXPLAIN 出来是 `type=ALL`，我一开始死活想不通，因为 `seller_id` 上单独建了索引。

真正的原因在 Extra 里：只有 `Using where`，没有 `Using index condition`。MySQL 在比较 `varchar` 列和数字常量时，会把列的值转成 `double` 再比，转换发生在列上而不是常量上，索引的有序性被破坏，于是只能整个索引扫一遍。修法有两种：代码里把参数当字符串传，或者把字段类型改成 `bigint unsigned`。我选了后者，因为用户 ID 本来就是数字，用 `varchar` 反而浪费空间，还容易在别的查询里重复踩这个坑。

## 坑三：回表与延迟关联

`idx_status_category_created` 只包含三个列，而查询还要 `title`、`price`、`cover_url`，所以每条命中的记录都要回表去聚簇索引取一次完整行。`LIMIT 20` 的时候只回表 20 次，看似不严重，但优化器在排序阶段的成本估算未必这么想。

我最后改成延迟关联，先用覆盖索引把 20 个主键捞出来，再回表取详情：

```sql
SELECT p.id, p.title, p.price, p.cover_url
FROM product p
JOIN (
    SELECT id FROM product
    WHERE status = 1 AND category_id = 12
    ORDER BY created_at DESC
    LIMIT 20
) t ON t.id = p.id;
```

内层查询全程走 `idx_status_category_created` 的覆盖索引，不需要回表；外层只回表 20 次。这一步又拿掉了一百多毫秒，最终接口 P99 从 4.2 秒降到 80 毫秒。

## 三步优化前后的对比

把三次改动和对应指标放在一起看更清楚：

| 阶段 | 关键改动 | type | 扫描行数 | Extra | P99 耗时 |
| --- | --- | --- | --- | --- | --- |
| 优化前 | 索引顺序 `(created_at, status, category_id)` | ALL | 812340 | Using filesort | 4.2 s |
| 第一步 | 调整为 `(status, category_id, created_at)` | ref | 1230 | 无 | 210 ms |
| 第二步 | 去掉字符串隐式转换 | ref | 1230 | 无 | 150 ms |
| 第三步 | 延迟关联 + 覆盖索引 | ref | 20（回表次数） | Using index | 80 ms |

## 几点体会

这次排查最大的收获不是记住了某个结论，而是发现 EXPLAIN 的 `type`、`key`、`rows`、`Extra` 四列基本能定位八成的问题：`type=ALL` 说明没走索引，`key=NULL` 说明优化器判断走索引不划算或者根本用不上，`rows` 是估算的扫描量，`Extra` 里的 `Using filesort`、`Using temporary` 往往直接指向排序和分组的问题。

另外我养成了一个习惯：任何会跑在列表页上的 SQL，先在测试库上 EXPLAIN 一遍，而不是等用户抱怨页面卡。这个习惯的成本是几秒钟。

还有一个细节值得记下来：`filtered` 那一列在排查时很有用。优化器预估 `status = 1` 只能过滤掉 10% 的行，所以它宁可全表扫也不走那个索引，说明这个列的选择性太差——如果某天低状态值的商品占了绝大多数，可能得考虑把 `status` 从索引里去掉。
