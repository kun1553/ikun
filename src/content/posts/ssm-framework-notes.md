---
title: 从 SSM 到 Spring Boot：那些 XML 到底配了什么
date: 2025-12-22
tags: [Java, SSM, Spring, 后端]
summary: 手写一遍 SSM 整合的 XML，讲清父子容器、Mapper 扫描与事务失效的根因，也终于明白 Spring Boot 帮我省掉了什么。
featured: false
---

## 学 Boot 的人为什么应该回头看看 SSM

我最开始是直接学 Spring Boot 的，`@SpringBootApplication` 一写，项目就跑起来了。方便，但也一直有个心虚的地方：我知道它帮我做了很多事，却不知道具体是什么事。

后来照着教程从头手写了一遍 SSM（Spring + Spring MVC + MyBatis）整合，配了四个 XML 文件，跑通的那一刻有种「原来你是这样拼起来的」的感觉。这篇把当时搞清楚的几件事记下来。

## 三家各自的职责

先分清谁管什么，比背配置重要得多：

- **Spring**：IoC 容器（`ApplicationContext`）和 AOP。它负责创建对象、注入依赖、给需要事务或切面的对象生成代理。它其实完全不认识 Web。
- **Spring MVC**：一个 Servlet 框架。核心是 `DispatcherServlet`，负责把 HTTP 请求映射到方法上，并处理返回值和视图。
- **MyBatis**：持久层框架。核心是 `SqlSessionFactory`，负责把 SQL 和 Java 对象互相转换，并给 Mapper 接口生成代理实现。

一句话概括当年的感觉：**Spring 是底座，MVC 是入口，MyBatis 是出口。**

## 整合时到底配了什么

`web.xml` 里通常会配两个东西：

```xml
<context-param>
    <param-name>contextConfigLocation</param-name>
    <param-value>classpath:applicationContext.xml</param-value>
</context-param>
<!-- 1. 启动 Spring 根容器（Service、数据源、事务） -->
<listener>
    <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>

<!-- 2. 启动 SpringMVC 子容器（Controller） -->
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>classpath:spring-mvc.xml</param-value>
    </init-param>
</servlet>
```

`applicationContext.xml` 负责数据源、`SqlSessionFactory`、事务管理器、Mapper 扫描：

```xml
<!-- 数据源 -->
<bean id="dataSource" class="com.alibaba.druid.pool.DruidDataSource">
    <property name="driverClassName" value="com.mysql.cj.jdbc.Driver"/>
    <property name="url" value="jdbc:mysql://127.0.0.1:3306/demo?useUnicode=true"/>
</bean>

<!-- MyBatis 的 SqlSessionFactory -->
<bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
    <property name="dataSource" ref="dataSource"/>
    <property name="mapperLocations" value="classpath:mapper/*.xml"/>
    <property name="typeAliasesPackage" value="com.demo.entity"/>
</bean>

<!-- 扫描 Mapper 接口，生成代理实现 -->
<bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
    <property name="basePackage" value="com.demo.mapper"/>
</bean>

<!-- 开启注解事务 -->
<tx:annotation-driven transaction-manager="transactionManager"/>
```

`spring-mvc.xml` 负责注解驱动、静态资源、视图解析器。到这里我才发现，所谓「整合」不过是**让两个容器分别持有自己需要的那部分 Bean**。

## 坑一：父子容器，`@Transactional` 写在 Controller 上不生效

这是整合期第一个把我卡了半天的问题。

现象：在 Controller 的方法上加了 `@Transactional`，故意抛异常，数据照样写进去了。

根因是父子容器的分工：`ContextLoaderListener` 启动的根容器扫描的是 Service/Mapper；`DispatcherServlet` 启动的子容器扫描的是 Controller。**子容器能拿到父容器的 Bean，父容器看不到子容器。而 `<tx:annotation-driven>` 配在根容器里，事务切面只作用于根容器里的 Bean。** Controller 在子容器，压根没有被事务代理包住。

还有一次是把 `@Controller` 也写进了根容器的扫描范围，结果同一个类被两个容器各创建一次，注入时看到的是两个不同对象，调试起来极其迷惑。

结论很朴素：**Controller 归 MVC 容器，Service/Mapper 归根容器，扫描包不要互相重叠。** Spring Boot 里只有一个容器，这个问题自然就消失了——这也是 Boot 最实在的好处之一。

## 坑二：DispatcherServlet 把静态资源也拦了

`<url-pattern>/</url-pattern>` 会接管所有未匹配的请求，包括 `/css/**`、`/js/**`。结果是页面样式全无、404 一片。

补救有两行 XML：

```xml
<mvc:default-servlet-handler/>
<mvc:annotation-driven/>
```

`default-servlet-handler` 会在找不到 Handler 时把请求交还给容器的默认 Servlet（也就是 Tomcat 处理静态文件的那个）。Spring Boot 里这件事由 `WebMvcAutoConfiguration` 自动完成，我只写过 `@GetMapping`，从没想过静态资源还需要「放行」。

## 坑三：MyBatis 用了 `${}` 拼接，做出了一个注入漏洞

`#{}` 是预编译占位符，`${}` 是直接字符串拼接。我用 `${}` 写了一个「按字段排序」的功能：

```xml
<!-- 危险：用户传什么就拼什么 -->
ORDER BY ${column}
```

如果 `column` 直接来自前端参数，`id; drop table t_user --` 就能拼进去。这个功能想安全，必须把 `column` 做成白名单枚举去校验，绝不能直接拼。

顺便记一个 Mapper 上的坑：接口没有被扫描到时，启动不报错，运行时注入失败，报的是「找不到 Bean」。`MapperScannerConfigurer` 的 `basePackage` 写错就是这么个表现——错误信息和使用处隔得很远，很费时间。

## 回到 Spring Boot

配完这一整套再回头看 Boot，它做的事就很清楚了：

- `@SpringBootApplication` 里的 `@EnableAutoConfiguration` 按 classpath 上的 jar 猜测你要什么，把上面那些 XML 变成了 starter 依赖；
- `@MapperScan` 等价于 `MapperScannerConfigurer`；
- `@Transactional` 直接可用，是因为只有一个容器、`DataSourceTransactionManager` 被自动装配好了；
- 静态资源、编码过滤器、DispatcherServlet 注册，全在自动配置里。

我也理解了为什么 Boot 的「约定优于配置」不是魔法：**所有约定，都能在某个 `XxxAutoConfiguration` 里找到那份被省掉的 XML。**

还有一点意外的收获。后来面试被问「什么情况下 Spring 事务会失效」，我能答上来（同类内部调用不走代理、方法不是 public、异常被自己吞掉、类没被 Spring 管理），不是因为我背了八股，而是因为我在 SSM 里真的配漏过 `tx:annotation-driven`，也真的把 `@Transactional` 写在 Controller 上过。

踩过的坑和背过的答案，在脑子里是两种完全不同的东西。
