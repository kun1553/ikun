<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  tag: { type: Object, required: true },
  /** 是否显示文章数量 */
  showCount: { type: Boolean, default: true },
  size: { type: String, default: 'md' }, // sm | md | lg
})
</script>

<template>
  <RouterLink
    :to="`/tags/${encodeURIComponent(tag.name)}`"
    class="tag-pill"
    :class="`size-${size}`"
  >
    <span class="name">{{ tag.name }}</span>
    <span v-if="showCount" class="count">{{ tag.count }}</span>
  </RouterLink>
</template>

<style scoped>
.tag-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text-soft);
  text-decoration: none;
  line-height: 1;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease,
    transform 0.15s ease;
}

.tag-pill:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
  background: var(--accent-soft);
  transform: translateY(-1px);
}

.name {
  font-weight: 550;
}

.count {
  font-size: 0.78em;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.size-sm {
  padding: 4px 9px;
  font-size: 12.5px;
  border-radius: 8px;
}

.size-md {
  font-size: 13.5px;
}

.size-lg {
  padding: 9px 16px;
  font-size: 15.5px;
  border-radius: 12px;
}
</style>
