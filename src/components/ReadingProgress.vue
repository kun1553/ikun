<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)

// 用 requestAnimationFrame 合并滚动事件，避免高频 scroll 回调里直接写样式
let ticking = false

function update() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop
  const height = document.documentElement.scrollHeight - window.innerHeight
  progress.value = height > 0 ? Math.min(1, Math.max(0, scrollTop / height)) : 0
  ticking = false
}

function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(update)
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div class="progress-track" aria-hidden="true">
    <div class="progress-fill" :style="{ transform: `scaleX(${progress})` }" />
  </div>
</template>

<style scoped>
.progress-track {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 100;
  pointer-events: none;
}

.progress-fill {
  height: 100%;
  width: 100%;
  transform-origin: 0 50%;
  transform: scaleX(0);
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: transform 0.08s linear;
}
</style>
