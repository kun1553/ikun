<script setup>
import { RouterLink } from 'vue-router'
import { posts } from '@/lib/posts'

const suggestions = posts.slice(0, 3)
</script>

<template>
  <div class="container page">
    <div class="hero">
      <p class="code" aria-hidden="true">404</p>
      <h1 class="title">这个页面不存在</h1>
      <p class="desc">
        链接可能写错了，或者这个地址从来没有存在过。
        不如从下面几篇文章开始看？
      </p>

      <div class="actions">
        <RouterLink to="/" class="btn btn-primary">回到首页</RouterLink>
        <RouterLink to="/posts" class="btn btn-ghost">全部文章</RouterLink>
      </div>
    </div>

    <section v-if="suggestions.length" class="suggest">
      <h2 class="suggest-title">也许你想看</h2>
      <div class="suggest-list">
        <RouterLink
          v-for="post in suggestions"
          :key="post.id"
          :to="`/posts/${post.id}`"
          class="suggest-item"
        >
          <span class="suggest-name">{{ post.title }}</span>
          <span class="suggest-meta">{{ post.date }} · {{ post.readingTime }} 分钟</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 72px 0 0;
}

.hero {
  display: grid;
  place-items: center;
  gap: 14px;
  text-align: center;
  padding: 40px 20px 60px;
}

.code {
  margin: 0;
  font-family: var(--font-mono);
  font-size: clamp(64px, 14vw, 118px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  opacity: 0.9;
}

.title {
  margin: 6px 0 0;
  font-size: clamp(21px, 3vw, 27px);
  font-weight: 700;
}

.desc {
  margin: 0;
  max-width: 44ch;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--text-soft);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.btn-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.btn-primary:hover {
  transform: translateY(-1px);
}

.btn-ghost {
  color: var(--text);
  border: 1px solid var(--border);
  background: var(--surface);
}

.btn-ghost:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.suggest {
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.suggest-title {
  margin: 0 0 16px;
  font-size: 15px;
  font-weight: 650;
}

.suggest-list {
  display: grid;
  gap: 10px;
}

.suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  text-decoration: none;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.suggest-item:hover {
  border-color: var(--accent-soft);
  transform: translateY(-1px);
}

.suggest-name {
  font-size: 14.2px;
  font-weight: 550;
  color: var(--text);
}

.suggest-item:hover .suggest-name {
  color: var(--accent);
}

.suggest-meta {
  flex-shrink: 0;
  font-size: 12.4px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .page {
    padding-top: 48px;
  }

  .suggest-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}
</style>
