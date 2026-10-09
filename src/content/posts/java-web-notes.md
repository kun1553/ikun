---
title: Java Web 复习：Servlet 到底是怎么被调用的
date: 2025-12-15
tags: [Java, Java Web, 后端]
summary: 从 Tomcat 的请求链路讲到 Servlet 生命周期、Session 与转发重定向，记录我在 Servlet 里用成员变量导致的串号事故。
featured: false
---

## 为什么要回头补 Java Web

用 Spring Boot 写了大半年之后，面试被问了一句「一个请求从进 Tomcat 到进你的 Controller，中间发生了什么」。我答了 DispatcherServlet，再往下就卡住了。

那一刻我才意识到，注解把太多东西藏起来了。`@GetMapping` 写起来确实舒服，但舒服的代价是我不知道自己依赖了什么。后来花了一周把 Servlet、Filter、Session 这一套重新过了一遍，这篇是当时的笔记。

## 一次请求在 Tomcat 里走了多远

Tomcat 的 `server.xml` 里，一个 Service 由 Connector 和 Engine 组成。请求进来之后的顺序大致是：

Connector 接收并解析 HTTP 报文，交给 Engine；Engine 里按 Host（虚拟主机）找到对应的 Context（一个 Context 就是一个 web 应用）；Context 里再按 URL 找到具体的 Wrapper（一个 Wrapper 就是一个 Servlet）；最后执行这个 Servlet 上配置的 Filter 链，再调 `service()`。

真正让我开窍的是下面这件事：**DispatcherServlet 本身就是一个注册在 `/` 上的普通 Servlet。**

```xml
<!-- web.xml 里最容易被忽略的两行 -->
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
</servlet>
<servlet-mapping>
    <servlet-name>dispatcher</servlet-name>
    <url-pattern>/</url-pattern>
</servlet-mapping>
```

SpringMVC 做的事，就是在这一个 Servlet 内部再分一层：`HandlerMapping` 找方法、`HandlerAdapter` 调方法、`ViewResolver` 处理返回值。想通这层之后，拦截器为什么比 Filter 更「懂业务」也就清楚了——拦截器在 DispatcherServlet 内部，能拿到 HandlerMethod；Filter 在外面，只知道 ServletRequest。

## 踩坑：Servlet 是单例的，我却把用户数据塞进了成员变量

这是我印象最深的一次事故，因为现象非常诡异：两个人同时登录，A 刷新页面后看到了 B 的昵称。

当时的代码大致是这样：

```java
public class UserServlet extends HttpServlet {
    // 危险：容器里只有一个 Servlet 实例，所有线程共享这个字段
    private String currentUser;

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
        currentUser = req.getParameter("user"); // 线程 A 写
        render(resp, currentUser);              // 线程 B 可能刚好也写到一半
    }
}
```

Servlet 规范里，容器只会创建**一个** Servlet 实例，所有并发请求共用它。所以成员变量在这里等价于全局变量。

修法很简单：状态一律放方法里的局部变量，或者放进 request／session 作用域。但这件事情的价值远大于修 bug 本身——它让我后来理解了 Spring 的 Controller 为什么默认也是单例、为什么 `@Autowired` 注入 Service 是安全的（因为 Service 本身无状态），以及为什么没人往 Controller 里写可变字段。同一个道理，换了个场景而已。

## Session 和 Cookie

- 浏览器第一次访问时，服务器调 `request.getSession()` 才创建 Session，并通过响应头 `Set-Cookie: JSESSIONID=xxx` 写回浏览器。
- 之后每个请求带上这个 Cookie，服务器据此找回 Session。**所以 Session 的本质是「服务端存数据 + 客户端只存一个 id」**。
- 浏览器禁用 Cookie 时会退化到 URL 重写（`response.encodeURL()`），把 `;jsessionid=xxx` 拼在地址后面。

这里埋了一个后面一定会撞上的问题：Session 存在单台服务器的内存里。一旦部署两台机器，用户第一次请求落在 A 上，第二次落在 B 上，B 不认识这个 JSESSIONID，就只能重新登录。当年的解法是粘性会话（ip_hash）或者 Session 复制，都很别扭。

这也是我后来在项目里用 Redis 存 token 的根本原因：把「会话状态」从某一台机器的内存里挪出来，放到一个所有机器都能访问的地方。Spring Session 干的就是这件事的自动化版本。

## 转发和重定向

| | forward（转发） | redirect（重定向） |
| --- | --- | --- |
| 请求次数 | 1 次 | 2 次 |
| 地址栏 | 不变 | 变成新地址 |
| request 域 | 能共享 | 丢失 |
| 能否访问 WEB-INF | 能 | 不能 |
| 写法 | `request.getRequestDispatcher("/a").forward(req, resp)` | `response.sendRedirect("/a")` |

我在这里踩的坑特别蠢：登录成功后我把用户信息塞进 request，然后 `sendRedirect` 到主页，再在主页里取 request 里的用户——当然是 null。因为重定向是浏览器发起的第二次请求，上一次的 request 早就没了。

判断方法其实很好记：**需要保留数据就用转发，需要改变地址（防止刷新重复提交）就用重定向。**

## Filter 与登录校验

Filter 的写法有个很容易写错的地方：

```java
public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain)
        throws IOException, ServletException {
    HttpServletRequest request = (HttpServletRequest) req;
    if (request.getRequestURI().contains("/login")) {
        chain.doFilter(req, resp); // 放行
        return;
    }
    // 拦截逻辑
    if (request.getSession().getAttribute("user") == null) {
        ((HttpServletResponse) resp).sendRedirect("/login.html");
        return;
    }
    chain.doFilter(req, resp);
}
```

两个坑：

一是 `/*` 一拦了之，把 css、js、图片也拦在外面，结果是登录页样式全丢、控制台一堆 302。白名单必须显式排除静态资源，或者干脆让过滤器只匹配业务路径。

二是 `chain.doFilter()` 前后相当于「环绕」逻辑，它之后还能继续写响应，但如果响应已经提交（比如已经 flush），再写就会抛 `IllegalStateException`。所以放行之后尽量不要再动响应。

## 小结

Java Web 这一套现在几乎不会直接写了，JSP 更是彻底退出了我的项目。但补完这一遍之后，我发现 Spring Boot 里那些「约定优于配置」的东西，我终于是懂了而不是背了。

比如 `DispatcherServlet` 自动注册、`CharacterEncodingFilter` 自动加上、静态资源默认放行，这些原来都是我手写十几行 XML 才能得到的效果。知道起点在哪，才知道现在省掉了什么。

下一篇准备记录 SSM 的整合，那些 XML 其实是一份非常好的「Spring 到底装配了哪些东西」的说明书。
