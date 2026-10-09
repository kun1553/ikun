import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'

// 只注册这个博客真实用得到的语言。
// 如果直接引入 highlight.js/lib/common，会把 30 多种语言一起打进产物
// （实测约 270KB），而这里只需要十分之一左右。
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import lua from 'highlight.js/lib/languages/lua'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

for (const [name, lang] of Object.entries({
  bash,
  c,
  cpp,
  ini,
  java,
  javascript,
  json,
  lua,
  plaintext,
  python,
  sql,
  typescript,
  // xml 注册后同时提供 html / vue 模板的高亮
  xml,
  yaml,
})) {
  hljs.registerLanguage(name, lang)
}

/**
 * 文章元数据与正文的加载层。
 *
 * 关键点：用 Vite 的 import.meta.glob 在「构建期」把 src/content/posts 下的所有
 * Markdown 文件作为原始字符串收集进来。这样运行时不需要任何后端接口，
 * 打包产物就是纯静态文件，可以直接丢到任意静态托管上。
 *
 * 性能上做了一层惰性：模块加载时只解析 front matter（很便宜），
 * Markdown 正文渲染推迟到真正打开文章详情页时才做，并且缓存结果。
 * 否则列表页会白白渲染全部文章的全部代码块。
 */
const modules = import.meta.glob('../content/posts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const md = new MarkdownIt({
  html: false, // 关闭内联 HTML，避免文章里误写的标签破坏页面
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch {
        /* 高亮失败就退回纯文本 */
      }
    }
    return md.utils.escapeHtml(code)
  },
})

/**
 * 极简 front matter 解析器。
 * 只支持本项目用到的字段形式：key: value 以及 [a, b] 形式的数组。
 * 之所以不引入 gray-matter，是为了把依赖控制在最小集合内。
 */
function parseFrontMatter(raw) {
  const text = raw.replace(/^\uFEFF/, '')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)

  if (!match) {
    return { data: {}, body: text }
  }

  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const sep = trimmed.indexOf(':')
    if (sep === -1) continue

    const key = trimmed.slice(0, sep).trim()
    const value = trimmed.slice(sep + 1).trim()
    data[key] = coerce(value)
  }

  return { data, body: text.slice(match[0].length) }
}

function coerce(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => stripQuotes(item.trim()))
      .filter(Boolean)
  }
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^\d+$/.test(value)) return Number(value)
  return stripQuotes(value)
}

function stripQuotes(value) {
  if (value.length > 1 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    return value.slice(1, -1)
  }
  return value
}

/** 根据文件路径推导文章 id，例如 ../content/posts/kmp-algorithm-notes.md -> kmp-algorithm-notes */
function idFromPath(path) {
  return path.split('/').pop().replace(/\.md$/, '')
}

/** 粗略估算阅读时长：中文按 400 字/分钟，英文按 200 词/分钟 */
function estimateReadingTime(body) {
  const cjk = (body.match(/[\u4e00-\u9fa5]/g) || []).length
  const words = (body.match(/[A-Za-z0-9]+/g) || []).length
  return Math.max(1, Math.ceil(cjk / 400 + words / 200))
}

/**
 * 渲染一篇 Markdown 正文。
 * 每次调用新建一个 env 用于收集目录，并对重复标题做去重，
 * 避免两篇都出现「小结」时锚点撞车。
 */
function renderMarkdown(body) {
  const headings = []
  const used = new Map()
  const env = { headings }

  const slugify = (text) => {
    const base =
      String(text)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{Letter}\p{Number}-]/gu, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '') || 'section'

    const seen = used.get(base) || 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  const defaultHeadingOpen =
    md.renderer.rules.heading_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx]
    const level = Number(token.tag.slice(1))

    if (level === 2 || level === 3) {
      const inline = tokens[idx + 1]
      const text = inline && inline.type === 'inline' ? inline.content : ''
      const id = slugify(text)
      token.attrSet('id', id)
      headings.push({ level, text, id })
    }

    return defaultHeadingOpen(tokens, idx, options, _env, self)
  }

  const html = md.render(body, env)
  return { html, headings }
}

function buildPost(path, raw) {
  const { data, body } = parseFrontMatter(raw)

  const post = {
    id: idFromPath(path),
    path,
    title: data.title || '无标题',
    date: data.date || '1970-01-01',
    tags: Array.isArray(data.tags) ? data.tags : [],
    summary: data.summary || '',
    featured: data.featured === true,
    draft: data.draft === true,
    body,
    readingTime: estimateReadingTime(body),
    /** 惰性渲染 + 缓存：第一次访问才真正跑 Markdown 和代码高亮 */
    get rendered() {
      if (!this._rendered) {
        this._rendered = renderMarkdown(this.body)
      }
      return this._rendered
    },
    get html() {
      return this.rendered.html
    },
    get headings() {
      return this.rendered.headings
    },
  }

  return post
}

/** 全部文章，按日期倒序（新的在前） */
export const posts = Object.entries(modules)
  .map(([path, raw]) => buildPost(path, raw))
  .filter((post) => !post.draft)
  .sort((a, b) => b.date.localeCompare(a.date))

export const featuredPosts = posts.filter((post) => post.featured)

/** 标签云：按出现次数倒序 */
export const tags = (() => {
  const counter = new Map()
  for (const post of posts) {
    for (const tag of post.tags) {
      counter.set(tag, (counter.get(tag) || 0) + 1)
    }
  }
  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})()

export function getPostById(id) {
  return posts.find((post) => post.id === id)
}

export function getPostsByTag(tag) {
  return posts.filter((post) => post.tags.includes(tag))
}

/** 同标签优先的相关文章推荐 */
export function getRelatedPosts(current, limit = 3) {
  const scored = posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      const shared = post.tags.filter((tag) => current.tags.includes(tag)).length
      return { post, score: shared * 10 + (post.featured ? 1 : 0) }
    })
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))

  return scored.slice(0, limit).map((item) => item.post)
}

/** 上一篇 / 下一篇（按日期排序后的相邻文章） */
export function getNeighbours(current) {
  const index = posts.findIndex((post) => post.id === current.id)
  return {
    newer: index > 0 ? posts[index - 1] : null,
    older: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null,
  }
}

export function formatDate(date) {
  const [year, month, day] = String(date).split('-')
  if (!year || !month || !day) return date
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`
}

export function formatDateShort(date) {
  const [year, month, day] = String(date).split('-')
  if (!year || !month || !day) return date
  return `${year}-${month}-${day}`
}
