<script setup>
import { computed, ref } from 'vue'
import PostCard from '@/components/PostCard.vue'
import { posts, tags } from '@/lib/posts'

const keyword = ref('')
const activeTag = ref('')
const sort = ref('newest')

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()

  const result = posts.filter((post) => {
    if (activeTag.value && !post.tags.includes(activeTag.value)) return false
    if (!q) return true
    return (
      post.title.toLowerCase().includes(q) ||
      post.summary.toLowerCase().includes(q) ||
      post.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })

  const sorted = [...result]
  sorted.sort((a, b) =>
    sort.value === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
  )
  return sorted
})

/** 按年份分组，只在「最新优先」时启用，让时间线读起来更清楚 */
const grouped = computed(() => {
  if (sort.value !== 'newest') return null

  const map = new Map()
  for (const post of filtered.value) {
    const year = post.date.slice(0, 4)
    if (!map.has(year)) map.set(year, [])
    map.get(year).push(post)
  }
  return [...map.entries()]
})

const hasFilter = computed(() => Boolean(keyword.value.trim() || activeTag.value))

function resetFilters() {
  keyword.value = ''
  activeTag.value = ''
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <p class="eyebrow">全部文章</p>
      <h1 class="page-title">写作归档</h1>
      <p class="page-desc">
        共 {{ posts.length }} 篇。技术笔记、课程复盘和读书心得都放在一起，
        用搜索或标签可以快速找到想看的内容。
      </p>
    </header>

    <div class="toolbar">
      <div class="search">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" class="search-icon">
          <circle cx="11" cy="11" r="6.4" fill="none" stroke="currentColor" stroke-width="1.8" />
          <path d="M16 16l4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索标题、摘要或标签…"
          aria-label="搜索文章"
        />
        <button v-if="keyword" type="button" class="clear" aria-label="清空搜索" @click="keyword = ''">
          ×
        </button>
      </div>

      <div class="sort">
        <button
          type="button"
          class="sort-btn"
          :class="{ 'is-active': sort === 'newest' }"
          @click="sort = 'newest'"
        >
          最新优先
        </button>
        <button
          type="button"
          class="sort-btn"
          :class="{ 'is-active': sort === 'oldest' }"
          @click="sort = 'oldest'"
        >
          最早优先
        </button>
      </div>
    </div>

    <div class="filters">
      <button
        type="button"
        class="filter-chip"
        :class="{ 'is-active': activeTag === '' }"
        @click="activeTag = ''"
      >
        全部
      </button>
      <button
        v-for="tag in tags"
        :key="tag.name"
        type="button"
        class="filter-chip"
        :class="{ 'is-active': activeTag === tag.name }"
        @click="activeTag = activeTag === tag.name ? '' : tag.name"
      >
        {{ tag.name }}
        <span class="chip-count">{{ tag.count }}</span>
      </button>
    </div>

    <p class="result-line">
      <template v-if="hasFilter">
        筛选出 <strong>{{ filtered.length }}</strong> 篇
        <button type="button" class="reset" @click="resetFilters">清除筛选</button>
      </template>
      <template v-else>按时间倒序排列</template>
    </p>

    <div v-if="!filtered.length" class="empty">
      <div class="empty-icon" aria-hidden="true">∅</div>
      <h2>没有匹配的文章</h2>
      <p>换个关键词，或者点下面的按钮看全部文章。</p>
      <button type="button" class="btn-reset" @click="resetFilters">查看全部文章</button>
    </div>

    <template v-else-if="grouped">
      <section v-for="[year, items] in grouped" :key="year" class="year-group">
        <h2 class="year-label">
          {{ year }}<span class="year-count">{{ items.length }} 篇</span>
        </h2>
        <div class="post-list">
          <PostCard v-for="post in items" :key="post.id" :post="post" />
        </div>
      </section>
    </template>

    <div v-else class="post-list">
      <PostCard v-for="post in filtered" :key="post.id" :post="post" />
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 48px 0 0;
}

.page-head {
  margin-bottom: 28px;
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
  font-size: clamp(26px, 3.6vw, 36px);
  font-weight: 700;
  letter-spacing: -0.015em;
}

.page-desc {
  margin: 0;
  max-width: 62ch;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-soft);
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 280px;
  min-width: 0;
  height: 42px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.search-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.search input::-webkit-search-cancel-button {
  display: none;
}

.clear {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.clear:hover {
  color: var(--text);
}

.sort {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
}

.sort-btn {
  height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-soft);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sort-btn:hover {
  color: var(--text);
}

.sort-btn.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text-soft);
  font-size: 12.8px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.filter-chip:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.filter-chip.is-active {
  color: #fff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.chip-count {
  font-size: 11px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.result-line {
  margin: 16px 0 18px;
  font-size: 13px;
  color: var(--text-muted);
}

.result-line strong {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.reset {
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--text-soft);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.reset:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.year-group + .year-group {
  margin-top: 34px;
}

.year-label {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.year-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.year-count {
  order: 3;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}

.post-list {
  display: grid;
  gap: 14px;
}

.empty {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 72px 20px;
  border: 1px dashed var(--border);
  border-radius: 16px;
  text-align: center;
}

.empty-icon {
  font-size: 34px;
  color: var(--text-muted);
  opacity: 0.5;
}

.empty h2 {
  margin: 6px 0 0;
  font-size: 17px;
  font-weight: 650;
}

.empty p {
  margin: 0;
  font-size: 14px;
  color: var(--text-muted);
}

.btn-reset {
  margin-top: 12px;
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

@media (max-width: 560px) {
  .page {
    padding-top: 34px;
  }

  .sort {
    flex: 1;
  }

  .sort-btn {
    flex: 1;
  }
}
</style>
