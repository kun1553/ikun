<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PostCard from '@/components/PostCard.vue'
import {
  formatDate,
  getNeighbours,
  getPostById,
  getRelatedPosts,
} from '@/lib/posts'

const route = useRoute()
const articleRef = ref(null)
const activeHeading = ref('')
const copied = ref(false)

const post = computed(() => getPostById(route.params.id))
const related = computed(() => (post.value ? getRelatedPosts(post.value, 3) : []))
const neighbours = computed(() => (post.value ? getNeighbours(post.value) : { newer: null, older: null }))

/**
 * 文章正文里的代码块在 Markdown 渲染阶段就变成了纯 HTML 字符串，
 * 没法直接挂 Vue 的事件，所以这里用 v-html 渲染完之后再手动加复制按钮。
 */
function enhanceCodeBlocks() {
  const root = articleRef.value
  if (!root) return

  root.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement
    if (pre.querySelector('.copy-code')) return

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'copy-code'
    button.textContent = '复制'
    button.setAttribute('aria-label', '复制代码')

    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent)
        button.textContent = '已复制'
        button.classList.add('is-done')
        copied.value = true
      } catch {
        button.textContent = '复制失败'
      }
      window.setTimeout(() => {
        button.textContent = '复制'
        button.classList.remove('is-done')
        copied.value = false
      }, 1600)
    })

    pre.appendChild(button)
  })
}

/** 目录点击：自己算滚动偏移，避开 64px 的吸顶导航遮挡标题 */
function scrollToHeading(id) {
  const target = articleRef.value?.querySelector(`#${CSS.escape(id)}`)
  if (!target) return

  const top = target.getBoundingClientRect().top + window.scrollY - 84
  window.scrollTo({ top, behavior: 'smooth' })
  activeHeading.value = id
  history.replaceState(null, '', `#${id}`)
}

/** 目录高亮：用 IntersectionObserver 比监听 scroll 更省，也不用自己算偏移 */
let observer = null

function observeHeadings() {
  observer?.disconnect()
  activeHeading.value = ''

  const headings = articleRef.value?.querySelectorAll('h2[id], h3[id]')
  if (!headings?.length) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible[0]) activeHeading.value = visible[0].target.id
    },
    { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
  )

  headings.forEach((heading) => observer.observe(heading))
}

onMounted(async () => {
  await nextTick()
  enhanceCodeBlocks()
  observeHeadings()
})

// 切换到另一篇文章时（同一个组件被复用）需要重新挂载增强逻辑
watch(
  () => route.params.id,
  async () => {
    await nextTick()
    enhanceCodeBlocks()
    observeHeadings()
  },
)
</script>

<template>
  <div v-if="!post" class="container page">
    <div class="not-found">
      <h1>找不到这篇文章</h1>
      <p>链接可能已经失效，或者文章 id 拼错了。</p>
      <RouterLink to="/posts" class="btn-primary">返回文章列表</RouterLink>
    </div>
  </div>

  <div v-else class="container page">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/">首页</RouterLink>
      <span aria-hidden="true">/</span>
      <RouterLink to="/posts">文章</RouterLink>
      <span aria-hidden="true">/</span>
      <span class="current">{{ post.title }}</span>
    </nav>

    <div class="layout">
      <article class="article">
        <header class="article-head">
          <div class="article-tags">
            <RouterLink
              v-for="tag in post.tags"
              :key="tag"
              :to="`/tags/${encodeURIComponent(tag)}`"
              class="tag"
            >
              {{ tag }}
            </RouterLink>
          </div>

          <h1 class="article-title">{{ post.title }}</h1>

          <p v-if="post.summary" class="article-summary">{{ post.summary }}</p>

          <div class="article-meta">
            <span class="avatar" aria-hidden="true">栢</span>
            <span>张栢焜</span>
            <span class="dot" aria-hidden="true">·</span>
            <time :datetime="post.date">{{ formatDate(post.date) }}</time>
            <span class="dot" aria-hidden="true">·</span>
            <span>约 {{ post.readingTime }} 分钟</span>
          </div>
        </header>

        <div ref="articleRef" class="markdown" v-html="post.html" />

        <nav class="post-nav" aria-label="上下篇">
          <RouterLink
            v-if="neighbours.older"
            :to="`/posts/${neighbours.older.id}`"
            class="nav-item"
          >
            <span class="nav-label">← 更早</span>
            <span class="nav-title">{{ neighbours.older.title }}</span>
          </RouterLink>
          <span v-else class="nav-item is-empty" />

          <RouterLink
            v-if="neighbours.newer"
            :to="`/posts/${neighbours.newer.id}`"
            class="nav-item nav-next"
          >
            <span class="nav-label">更新 →</span>
            <span class="nav-title">{{ neighbours.newer.title }}</span>
          </RouterLink>
          <span v-else class="nav-item is-empty" />
        </nav>

        <section v-if="related.length" class="related">
          <h2 class="related-title">相关文章</h2>
          <div class="related-list">
            <PostCard
              v-for="item in related"
              :key="item.id"
              :post="item"
              compact
              :show-summary="false"
            />
          </div>
        </section>
      </article>

      <aside class="toc" aria-label="文章目录">
        <div class="toc-inner">
          <h2 class="toc-title">目录</h2>
          <ul v-if="post.headings.length" class="toc-list">
            <li
              v-for="heading in post.headings"
              :key="heading.id"
              :class="[`level-${heading.level}`, { 'is-active': activeHeading === heading.id }]"
            >
              <a
                :href="`#${heading.id}`"
                @click.prevent="scrollToHeading(heading.id)"
              >{{ heading.text }}</a>
            </li>
          </ul>
          <p v-else class="toc-empty">这篇文章没有小标题</p>

          <div class="toc-actions">
            <RouterLink to="/posts" class="toc-btn">全部文章</RouterLink>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 30px 0 0;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
  font-size: 12.8px;
  color: var(--text-muted);
  overflow: hidden;
}

.breadcrumb a {
  color: var(--text-soft);
  text-decoration: none;
  white-space: nowrap;
}

.breadcrumb a:hover {
  color: var(--accent);
}

.breadcrumb .current {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 232px;
  gap: 44px;
  align-items: start;
}

/*
 * 网格子项的 min-width 默认是 auto，也就是「不能小于内容的最小宽度」。
 * 代码块里有一行很长的代码时，它的最小宽度会非常大，把整条 1fr 轨道顶宽，
 * 于是窄屏上整页出现横向滚动。必须显式设成 0 才允许收缩。
 */
.article,
.toc {
  min-width: 0;
}

/* ---------- 文章头 ---------- */
.article-head {
  padding-bottom: 26px;
  border-bottom: 1px solid var(--border);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 16px;
}

.tag {
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12.2px;
  font-weight: 550;
  text-decoration: none;
}

.tag:hover {
  border-color: var(--accent);
}

.article-title {
  margin: 0 0 14px;
  font-size: clamp(25px, 3.8vw, 36px);
  line-height: 1.32;
  font-weight: 700;
  letter-spacing: -0.015em;
}

.article-summary {
  margin: 0 0 20px;
  padding-left: 14px;
  border-left: 3px solid var(--accent-soft);
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-soft);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-muted);
}

.avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
}

.dot {
  opacity: 0.6;
}

/* ---------- 上下篇 ---------- */
.post-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 44px 0 0;
}

.nav-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.nav-item:hover {
  border-color: var(--accent-soft);
  transform: translateY(-1px);
}

.nav-item.is-empty {
  border: 1px dashed var(--border);
  background: transparent;
}

.nav-next {
  text-align: right;
}

.nav-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.nav-title {
  font-size: 14px;
  font-weight: 550;
  line-height: 1.5;
  color: var(--text);
}

.nav-item:hover .nav-title {
  color: var(--accent);
}

/* ---------- 相关文章 ---------- */
.related {
  margin-top: 40px;
}

.related-title {
  margin: 0 0 14px;
  font-size: 15.5px;
  font-weight: 650;
}

.related-list {
  display: grid;
  gap: 10px;
}

/* ---------- 目录 ---------- */
.toc {
  position: sticky;
  top: 88px;
}

.toc-inner {
  padding-left: 16px;
  border-left: 1px solid var(--border);
}

.toc-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.toc-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
}

.toc-list li a {
  display: block;
  padding: 4px 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
  cursor: pointer;
}

.toc-list .level-3 a {
  padding-left: 12px;
  font-size: 12.4px;
}

.toc-list li:hover a,
.toc-list li.is-active a {
  color: var(--accent);
}

.toc-list li.is-active a {
  font-weight: 600;
}

.toc-empty {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

.toc-actions {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.toc-btn {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text-soft);
  font-size: 12.8px;
  text-decoration: none;
}

.toc-btn:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

/* ---------- 未找到 ---------- */
.not-found {
  display: grid;
  place-items: center;
  gap: 10px;
  padding: 90px 20px;
  text-align: center;
}

.not-found h1 {
  margin: 0;
  font-size: 24px;
}

.not-found p {
  margin: 0;
  color: var(--text-muted);
}

.btn-primary {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .toc {
    position: static;
    order: -1;
  }

  .toc-inner {
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
  }
}

@media (max-width: 560px) {
  .post-nav {
    grid-template-columns: 1fr;
  }

  .nav-next {
    text-align: left;
  }
}
</style>
