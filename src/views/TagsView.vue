<script setup>
import TagPill from '@/components/TagPill.vue'
import { posts, tags } from '@/lib/posts'

const maxCount = Math.max(...tags.map((tag) => tag.count), 1)

/** 按文章数量把标签分成三个热度档，字号跟着变，做出标签云的高低错落 */
function heat(tag) {
  const ratio = tag.count / maxCount
  if (ratio > 0.66) return 'lg'
  if (ratio > 0.33) return 'md'
  return 'sm'
}
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <p class="eyebrow">标签</p>
      <h1 class="page-title">按标签浏览</h1>
      <p class="page-desc">
        一共 {{ tags.length }} 个标签，覆盖 {{ posts.length }} 篇文章。
        标签字号越大表示该主题下的文章越多。
      </p>
    </header>

    <div class="cloud">
      <TagPill
        v-for="tag in tags"
        :key="tag.name"
        :tag="tag"
        :size="heat(tag)"
      />
    </div>

    <section class="overview">
      <h2 class="overview-title">标签明细</h2>
      <ul class="tag-rows">
        <li v-for="tag in tags" :key="tag.name" class="tag-row">
          <RouterLink :to="`/tags/${encodeURIComponent(tag.name)}`" class="row-name">
            {{ tag.name }}
          </RouterLink>
          <span class="row-bar" aria-hidden="true">
            <span class="row-fill" :style="{ width: `${(tag.count / maxCount) * 100}%` }" />
          </span>
          <span class="row-count">{{ tag.count }} 篇</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 48px 0 0;
}

.page-head {
  margin-bottom: 30px;
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
  max-width: 60ch;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-soft);
}

.cloud {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 26px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    radial-gradient(420px 200px at 8% 0%, var(--accent-soft), transparent 70%),
    var(--surface);
}

.overview {
  margin-top: 44px;
}

.overview-title {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 650;
}

.tag-rows {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
}

.tag-row {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) 58px;
  align-items: center;
  gap: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  transition: background-color 0.15s ease;
}

.tag-row:hover {
  background: var(--surface-2);
}

.row-name {
  font-size: 13.8px;
  font-weight: 550;
  color: var(--text);
  text-decoration: none;
}

.row-name:hover {
  color: var(--accent);
}

.row-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--surface-2);
  overflow: hidden;
}

.row-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.row-count {
  font-size: 12.5px;
  color: var(--text-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 560px) {
  .page {
    padding-top: 34px;
  }

  .cloud {
    padding: 18px;
  }

  .tag-row {
    grid-template-columns: 96px minmax(0, 1fr) 50px;
    gap: 10px;
  }
}
</style>
