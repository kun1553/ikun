<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PostCard from '@/components/PostCard.vue'
import TagPill from '@/components/TagPill.vue'
import { featuredPosts, posts, tags } from '@/lib/posts'

const recentPosts = computed(() => posts.slice(0, 4))

const stats = computed(() => [
  { label: '篇文章', value: posts.length },
  { label: '个标签', value: tags.length },
  { label: '分钟阅读', value: posts.reduce((sum, post) => sum + post.readingTime, 0) },
])
</script>

<template>
  <div class="home">
    <!-- 首屏 -->
    <section class="hero">
      <div class="container hero-inner">
        <div class="hero-text">
          <p class="hero-eyebrow">
            <span class="pulse" aria-hidden="true"></span>
            计算机科学与技术 · 在读
          </p>

          <h1 class="hero-title">
            你好，我是<strong>张栢焜</strong>
          </h1>

          <p class="hero-desc">
            我在这个博客里记录算法与数据结构、Java 后端、前端工程化的学习过程。
            这里没有速成笔记，只有把一个问题真正弄明白之后留下的痕迹 ——
            包括走过的弯路和踩过的坑。
          </p>

          <div class="hero-actions">
            <RouterLink to="/posts" class="btn btn-primary">开始阅读</RouterLink>
            <RouterLink to="/projects" class="btn btn-ghost">看看项目</RouterLink>
          </div>

          <dl class="hero-stats">
            <div v-for="item in stats" :key="item.label" class="stat">
              <dt>{{ item.value }}</dt>
              <dd>{{ item.label }}</dd>
            </div>
          </dl>
        </div>

        <aside class="hero-card">
          <div class="code-window">
            <div class="code-bar">
              <span class="dot dot-r" /><span class="dot dot-y" /><span class="dot dot-g" />
              <span class="code-file">about-me.js</span>
            </div>
            <pre class="code-body"><code><span class="c-key">const</span> <span class="c-var">张栢焜</span> = {
  <span class="c-prop">major</span>: <span class="c-str">'计算机科学与技术'</span>,
  <span class="c-prop">focus</span>: [<span class="c-str">'算法'</span>, <span class="c-str">'后端'</span>, <span class="c-str">'前端工程化'</span>],
  <span class="c-prop">stack</span>: [<span class="c-str">'Java'</span>, <span class="c-str">'Spring Boot'</span>, <span class="c-str">'Vue 3'</span>, <span class="c-str">'MySQL'</span>],
  <span class="c-prop">currently</span>: <span class="c-str">'读 CSAPP，补计算机基础'</span>,
  <span class="c-prop">belief</span>: <span class="c-str">'写下来才算想明白'</span>,
}</code></pre>
          </div>
        </aside>
      </div>
    </section>

    <!-- 精选文章 -->
    <section v-if="featuredPosts.length" class="section container">
      <header class="section-head">
        <div>
          <h2 class="section-title">精选文章</h2>
          <p class="section-sub">挑了几篇自己觉得写得最用力的</p>
        </div>
        <RouterLink to="/posts" class="more-link">全部文章 →</RouterLink>
      </header>

      <div class="featured-grid">
        <PostCard v-for="post in featuredPosts" :key="post.id" :post="post" />
      </div>
    </section>

    <!-- 最新文章 + 侧栏 -->
    <section class="section container two-col">
      <div>
        <header class="section-head">
          <div>
            <h2 class="section-title">最新文章</h2>
            <p class="section-sub">按时间倒序</p>
          </div>
        </header>

        <div class="recent-list">
          <PostCard v-for="post in recentPosts" :key="post.id" :post="post" />
        </div>
      </div>

      <aside class="sidebar">
        <div class="panel">
          <h3 class="panel-title">标签云</h3>
          <div class="tag-cloud">
            <TagPill v-for="tag in tags" :key="tag.name" :tag="tag" size="sm" />
          </div>
        </div>

        <div class="panel panel-accent">
          <h3 class="panel-title">关于这个站</h3>
          <p class="panel-text">
            用 Vue 3 + Vite 手写，Markdown 驱动，没有套现成主题。
            文章在构建期被解析成静态页面，所以打开速度很快。
          </p>
          <RouterLink to="/about" class="panel-link">了解更多 →</RouterLink>
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 首屏 ---------- */
.hero {
  padding: 64px 0 48px;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(760px 320px at 12% -10%, var(--accent-soft), transparent 70%),
    radial-gradient(560px 280px at 92% 8%, var(--accent-2-soft), transparent 72%);
}

.hero-inner {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 44px;
  align-items: center;
}

/*
 * 同 PostView：网格子项的 min-width 默认是 auto，
 * 右侧代码窗里有一行 100 多字符的代码，会把 1fr 轨道顶宽导致窄屏横向溢出。
 */
.hero-text,
.hero-card {
  min-width: 0;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: 12.5px;
  color: var(--text-soft);
}

.pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 0 var(--ok);
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ok) 55%, transparent);
  }
  100% {
    box-shadow: 0 0 0 9px transparent;
  }
}

.hero-title {
  margin: 0 0 16px;
  font-size: clamp(30px, 4.4vw, 46px);
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.hero-title strong {
  background: linear-gradient(100deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  margin: 0 0 26px;
  max-width: 54ch;
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--text-soft);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 22px;
  border-radius: 11px;
  font-size: 14.5px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease,
    border-color 0.15s ease;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 10px 24px -14px var(--accent);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px -14px var(--accent);
}

.btn-ghost {
  color: var(--text);
  border: 1px solid var(--border);
  background: var(--surface);
}

.btn-ghost:hover {
  border-color: var(--accent-soft);
  color: var(--accent);
}

.hero-stats {
  display: flex;
  gap: 34px;
  margin: 34px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.stat dt {
  font-size: 25px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.stat dd {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

/* ---------- 首屏代码窗 ---------- */
.code-window {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--code-bg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.code-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-r {
  background: #ff5f57;
}
.dot-y {
  background: #febc2e;
}
.dot-g {
  background: #28c840;
}

.code-file {
  margin-left: 6px;
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.code-body {
  margin: 0;
  padding: 16px 18px 18px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12.8px;
  line-height: 1.85;
  color: var(--code-text);
  tab-size: 2;
}

.c-key {
  color: #c678dd;
}
.c-var {
  color: #e5c07b;
}
.c-prop {
  color: #61afef;
}
.c-str {
  color: #98c379;
}

/* ---------- 通用区块 ---------- */
.section {
  margin-top: 56px;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-title {
  margin: 0;
  font-size: 21px;
  font-weight: 680;
  letter-spacing: -0.005em;
}

.section-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
}

.more-link {
  font-size: 13.5px;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
}

.more-link:hover {
  text-decoration: underline;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.two-col {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 32px;
  align-items: start;
}

.recent-list {
  display: grid;
  gap: 14px;
}

.sidebar {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 84px;
}

.panel {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.panel-accent {
  background: linear-gradient(150deg, var(--accent-soft), var(--surface));
}

.panel-title {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 650;
}

.panel-text {
  margin: 0 0 12px;
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--text-soft);
}

.panel-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.panel-link:hover {
  text-decoration: underline;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 940px) {
  .hero-inner,
  .two-col {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .featured-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .hero {
    padding: 40px 0 34px;
  }

  .hero-stats {
    gap: 22px;
  }

  .stat dt {
    font-size: 21px;
  }
}
</style>
