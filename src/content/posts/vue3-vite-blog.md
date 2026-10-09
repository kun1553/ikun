---
title: 用 Vue 3 + Vite 从零手搓一个博客
date: 2025-09-21
tags: [Vue, Vite, 前端]
summary: 从技术选型到构建期加载 Markdown，记录我用 Vue 3 和 Vite 手写博客时踩过的坑和打包体积实测。
featured: true
---

## 选型：不想被主题绑架

动手之前我试过两条现成的路。一条是 Hexo，套了个 star 比较多的主题，半小时就跑起来了，但想改首页摘要的截断长度时，我在一堆模板文件里翻了二十分钟才找到地方；另一条是 Next.js 的博客模板，功能很全，可它默认要跑 Node 服务，部署到静态托管上还得切成导出模式，而我要的只是一个纯静态站。

真正让我下决心自己写的原因是：这个博客本身可以当成一个前端工程练习题。构建期加载 Markdown、路由懒加载、代码高亮按需引入，这些概念我听过，但没自己实现过。所以最后的技术栈是 Vue 3 组合式 API + Vite + vue-router，不引入 UI 组件库，样式手写。

`vite.config.js` 里主要是别名和分包两块：

```js
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2018',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          markdown: ['markdown-it', 'highlight.js'],
        },
      },
    },
  },
})
```

## 构建期把 Markdown 读进来

最初我的做法是运行时 `fetch('/posts/hello-world.md')`，问题是列表页要拿到所有文章的标题和摘要，就得先请求一个索引文件，再逐篇请求正文，请求数量随文章数线性增长。后来换成 Vite 的 `import.meta.glob`：

```js
// src/lib/posts.js
const modules = import.meta.glob('../content/posts/*.md', {
  query: '?raw',    // 要原始文本，不要编译后的模块
  import: 'default',
  eager: true,      // 构建期一次性读进来，运行时就是普通字符串
})

export const posts = Object.entries(modules).map(([path, raw]) => {
  const id = path.split('/').pop().replace(/\.md$/, '')
  const { data, body } = parseFrontMatter(raw)
  return { id, ...data, body }
})
```

`eager: true` 的代价是全部文章都进主包，所以我做了一层惰性：模块加载时只解析 front matter（很便宜），Markdown 正文的渲染推迟到真正打开详情页时再做，并缓存结果，否则列表页会白白渲染所有文章的所有代码块。

## front matter 解析器踩的坑

一开始我用 `raw.split('---')` 取头部，本地测试没问题，直到写了一篇正文里有分割线的文章，整篇内容被切成了三段。改成锚定文件开头的正则：

```js
const RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

function parseFrontMatter(raw) {
  const m = RE.exec(raw.replace(/^\uFEFF/, ''))
  if (!m) return { data: {}, body: raw }

  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    let value = line.slice(sep + 1).trim()
    if (value === 'true' || value === 'false') value = value === 'true'
    else if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
    }
    data[key] = value
  }
  return { data, body: m[2] }
}
```

这段代码里 `\r?\n` 一个都不能省。我在 Windows 上写文件是 CRLF，正则只写 `\n` 的时候，`split('\n')` 每行末尾都会留一个 `\r`，结果按标签筛选时最后一个标签实际是「大学生活\r」，永远匹配不上。这个问题调了快一个小时，最后是靠 `console.log(JSON.stringify(tags))` 才看出来的。

## markdown-it 与按需高亮

渲染用 markdown-it，高亮交给 highlight.js。第一版直接 `import hljs from 'highlight.js'`，等于把所有语言定义都打进了产物：

```text
dist/assets/index-*.js   2,340.11 kB │ gzip: 512.46 kB
```

改成只注册写博客会用到的语言：

```js
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import java from 'highlight.js/lib/languages/java'
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('java', java)
```

一共注册了 java、cpp、c、javascript、sql、yaml、bash、json 八种，再加上 `manualChunks` 把 markdown 相关依赖单独拆包，构建结果变成：

```text
dist/assets/index-*.js      346.72 kB │ gzip: 118.92 kB
dist/assets/markdown-*.js   298.41 kB │ gzip:  96.03 kB
dist/assets/vendor-*.js     102.18 kB │ gzip:  40.55 kB
```

总体积从 2.3 MB 降到 750 KB 左右，gzip 后从 512 KB 降到 256 KB。列表页不需要 markdown 那个 chunk，实际首屏只加载 index 和 vendor，用 Lighthouse 在 4 倍 CPU 降速下测，FCP 从 1.9s 掉到 0.7s。本地数据肯定比线上乐观，但这个量级的变化足够说明问题。

## 路由懒加载

```js
const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/posts', name: 'posts', component: () => import('@/views/PostsView.vue') },
  { path: '/post/:id', name: 'post', component: () => import('@/views/PostView.vue') },
]
```

详情页和 markdown-it 被归到同一个 chunk，列表页不用为它们买单。做完这些，首页加载的资源只有 vue、vue-router 和文章元信息，剩下的优化我暂时想不出还有多大空间了。
