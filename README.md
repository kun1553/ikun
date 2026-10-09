# 张栢焜的博客

计算机科学与技术方向的学习笔记站点。用 **Vue 3 + Vite 手写**，没有套用任何现成主题。

## 技术栈

| 用途 | 选型 |
| --- | --- |
| 框架 | Vue 3（组合式 API，`<script setup>`） |
| 构建 | Vite 6 |
| 路由 | Vue Router 4（hash 模式） |
| 文章渲染 | markdown-it + 构建期 `import.meta.glob` |
| 代码高亮 | highlight.js（按需注册语言） |
| 样式 | 原生 CSS + CSS 变量，无 UI 框架 |

## 快速开始

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器，默认 http://127.0.0.1:5173
npm run build        # 构建到 dist/
npm run preview      # 本地预览构建产物，默认 http://127.0.0.1:4173
```

## 目录结构

```
src/
├── main.js                 应用入口
├── App.vue                 外壳：顶栏 + 页面 + 页脚 + 阅读进度条
├── router/index.js         路由表（页面级懒加载）
├── lib/posts.js            内容层：解析 front matter、渲染 Markdown、标签与相关文章
├── composables/useTheme.js 深浅色主题状态
├── components/
│   ├── SiteHeader.vue      吸顶导航，窄屏折叠成菜单
│   ├── SiteFooter.vue
│   ├── PostCard.vue        文章卡片（支持紧凑模式）
│   ├── TagPill.vue         标签胶囊
│   └── ReadingProgress.vue 顶部阅读进度条
├── views/                  首页 / 文章列表 / 文章详情 / 标签 / 单标签 / 项目 / 关于 / 404
├── content/posts/*.md      文章源文件（Markdown）
└── styles/main.css         设计令牌、深浅色主题、Markdown 排版、代码高亮配色
```

## 写一篇新文章

在 `src/content/posts/` 下新建 `.md` 文件，头部格式固定：

```markdown
---
title: 文章标题
date: 2026-01-15
tags: [Vue, 工程化]
summary: 一句话摘要，会显示在列表页，建议 40~60 字
featured: true
---

## 从这里开始写正文

正文支持标题、列表、引用、表格、代码块。
```

约定与注意点：

- **文件名就是文章 id**，也就是 URL 里的 `#/posts/<文件名>`。
- 解析器是自己写的简易实现，所以 `tags` 必须写成 `[标签1, 标签2]` 这种方括号加英文逗号的形式，`featured` 只写裸的 `true` / `false`。
- 正文第一个标题用 `##`，`#` 一级标题由站点自动渲染成文章标题。
- 正文里不要出现单独成行的 `---`，会和 front matter 的结束标记冲突（想分割段落用 `##` 或用 `<hr>` 之外的写法）。
- 文章列表和标签云都是自动从这些文件推导出来的，新增文章不需要改任何代码。
- 想临时把文章藏起来，在头部加 `draft: true`。

代码块的语言标识必须在注册表里，当前已注册：`bash`、`c`、`cpp`、`ini`、`java`、`javascript`、`json`、`lua`、`plaintext`/`text`、`python`、`sql`、`typescript`、`xml`(含 `html`)、`yaml`。要加新语言，在 `src/lib/posts.js` 里 import 并注册即可（不要直接引 `highlight.js/lib/common`，那会把 30 多种语言一起打进产物）。

## 部署

`npm run build` 产出的 `dist/` 就是一堆静态文件，丢到任意静态托管（GitHub Pages、Vercel、Netlify、对象存储）都能直接跑。

路由用的是 **hash 模式**（URL 里带 `#`），好处是托管方不需要配置「未命中路径回退到 index.html」的重写规则，把文件放上去就行。

## 开发辅助脚本

需要先 `npm run preview` 起一个本地服务，然后：

```bash
# 页面断言检查：控制台报错、请求失败、横向溢出、关键元素内容
node scripts/check-pages.mjs --base http://127.0.0.1:4173 --out .verify

# 只跑断言不截图
node scripts/check-pages.mjs --base http://127.0.0.1:4173 --shots false

# 多视口横向溢出专项检查（360 / 390 / 768 / 1440）
node scripts/check-overflow.mjs http://127.0.0.1:4173

# 按名称批量截图（浅色 / 深色 / 移动端）
node scripts/shots.mjs http://127.0.0.1:4173 .verify
```

这三个脚本用无头 Chrome/Edge 的 DevTools 协议驱动，不依赖 Puppeteer，退出码非 0 表示有检查项失败。

## 一些实现上的取舍

- **构建期加载 Markdown**：用 `import.meta.glob(..., { eager: true, query: '?raw' })` 在打包时把文章读成字符串，运行时不需要任何后端接口。
- **Markdown 惰性渲染**：模块加载时只解析 front matter，正文渲染推迟到打开详情页时才做，并缓存结果，列表页不为代码高亮付出代价。
- **只注册用得到的语言**：把 highlight.js 从 `lib/common` 换成 `lib/core` 加按需注册后，markdown 分包从 269 KB 降到 126 KB。
- **第三方库单独拆包**：`vendor`（Vue 全家桶）和 `markdown`（渲染 + 高亮）分开，改文章不会让用户重新下载框架代码。
- **网格子项显式 `min-width: 0`**：代码块里的一行长代码会把 `1fr` 网格轨道顶宽，导致窄屏整页横向滚动，必须显式允许收缩。

## 已知的环境限制（仅影响在受限沙箱里构建）

如果在 DSH 的受限沙箱模式下运行，Vite 会因为需要启动 esbuild 辅助进程并开管道而报 `spawn EPERM`。这不是项目的问题，把会话切到完整权限即可正常 `npm run build`。
