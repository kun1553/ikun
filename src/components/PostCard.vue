<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDateShort } from '@/lib/posts'

const props = defineProps({
  post: { type: Object, required: true },
  /** 紧凑模式：首页侧栏、相关文章推荐用 */
  compact: { type: Boolean, default: false },
  /** 是否展示摘要 */
  showSummary: { type: Boolean, default: true },
})

const to = computed(() => `/posts/${props.post.id}`)
</script>

<template>
  <article class="post-card" :class="{ 'is-compact': compact }">
    <div class="card-meta">
      <time :datetime="post.date">{{ formatDateShort(post.date) }}</time>
      <span class="dot" aria-hidden="true">·</span>
      <span>{{ post.readingTime }} 分钟</span>
      <span v-if="post.featured" class="badge">精选</span>
    </div>

    <h3 class="card-title">
      <RouterLink :to="to">{{ post.title }}</RouterLink>
    </h3>

    <p v-if="showSummary && post.summary" class="card-summary">{{ post.summary }}</p>

    <div v-if="post.tags.length" class="card-tags">
      <RouterLink
        v-for="tag in post.tags"
        :key="tag"
        :to="`/tags/${encodeURIComponent(tag)}`"
        class="tag"
      >
        {{ tag }}
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.post-card {
  position: relative;
  padding: 20px 22px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.post-card:hover {
  border-color: var(--accent-soft);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.dot {
  opacity: 0.6;
}

.badge {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  background: var(--accent-soft);
}

.card-title {
  margin: 10px 0 0;
  font-size: 18.5px;
  line-height: 1.45;
  font-weight: 650;
  letter-spacing: 0.005em;
}

.card-title a {
  color: var(--text);
  text-decoration: none;
}

.card-title a:hover {
  color: var(--accent);
}

.card-summary {
  margin: 9px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-soft);
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.tag {
  padding: 3px 9px;
  border-radius: 7px;
  font-size: 12px;
  color: var(--text-soft);
  background: var(--surface-2);
  border: 1px solid transparent;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tag:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.is-compact {
  padding: 14px 16px;
  border-radius: 12px;
}

.is-compact .card-title {
  font-size: 15.5px;
  margin-top: 7px;
}

.is-compact .card-summary {
  font-size: 13px;
  line-height: 1.7;
}
</style>
