<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import PostCard from '@/components/PostCard.vue'
import TagPill from '@/components/TagPill.vue'
import { getPostsByTag, tags } from '@/lib/posts'

const route = useRoute()

const tagName = computed(() => String(route.params.tag || ''))
const matched = computed(() => tags.find((tag) => tag.name === tagName.value) || null)
const list = computed(() => getPostsByTag(tagName.value))
const totalMinutes = computed(() => list.value.reduce((sum, post) => sum + post.readingTime, 0))

/** 侧栏推荐：和当前标签共同出现次数最多的其它标签 */
const siblingTags = computed(() => {
  if (!matched.value) return []

  const counter = new Map()
  for (const post of list.value) {
    for (const tag of post.tags) {
      if (tag === tagName.value) continue
      counter.set(tag, (counter.get(tag) || 0) + 1)
    }
  }

  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
})
</script>

<template>
  <div class="container page">
    <nav class="breadcrumb" aria-label="面包屑">
      <RouterLink to="/">首页</RouterLink>
      <span aria-hidden="true">/</span>
      <RouterLink to="/tags">标签</RouterLink>
      <span aria-hidden="true">/</span>
      <span class="current">{{ tagName }}</span>
    </nav>

    <header class="page-head">
      <p class="eyebrow">标签</p>
      <h1 class="page-title">{{ tagName }}</h1>
      <p class="page-desc">
        <template v-if="list.length">
          共 {{ list.length }} 篇，合计约 {{ totalMinutes }} 分钟阅读时间。
        </template>
        <template v-else>这个标签下还没有文章。</template>
      </p>
    </header>

    <div class="body">
      <div>
        <div v-if="list.length" class="post-list">
          <PostCard v-for="post in list" :key="post.id" :post="post" />
        </div>

        <div v-else class="empty">
          <p>没有找到标着「{{ tagName }}」的文章。</p>
          <RouterLink to="/tags" class="link">看看所有标签 →</RouterLink>
        </div>
      </div>

      <aside v-if="siblingTags.length" class="sidebar">
        <h2 class="sidebar-title">常一起出现</h2>
        <div class="sibling-list">
          <TagPill v-for="tag in siblingTags" :key="tag.name" :tag="tag" size="sm" />
        </div>
        <RouterLink to="/tags" class="all-link">全部标签 →</RouterLink>
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
  margin-bottom: 24px;
  font-size: 12.8px;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--text-soft);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--accent);
}

.page-head {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.page-title {
  margin: 0 0 12px;
  font-size: clamp(25px, 3.4vw, 34px);
  font-weight: 700;
  letter-spacing: -0.015em;
}

.page-desc {
  margin: 0;
  font-size: 14.5px;
  color: var(--text-soft);
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 34px;
  align-items: start;
}

.post-list {
  display: grid;
  gap: 14px;
}

.sidebar {
  position: sticky;
  top: 88px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.sidebar-title {
  margin: 0 0 14px;
  font-size: 13.5px;
  font-weight: 650;
}

.sibling-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.all-link {
  display: inline-block;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  width: 100%;
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.all-link:hover {
  text-decoration: underline;
}

.empty {
  padding: 64px 20px;
  border: 1px dashed var(--border);
  border-radius: 16px;
  text-align: center;
}

.empty p {
  margin: 0 0 12px;
  color: var(--text-muted);
}

.link {
  font-size: 13.5px;
  color: var(--accent);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

@media (max-width: 940px) {
  .body {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}

@media (max-width: 560px) {
  .page {
    padding-top: 20px;
  }
}
</style>
