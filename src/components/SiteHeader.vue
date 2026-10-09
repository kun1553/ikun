<script setup>
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'

const route = useRoute()
const { theme, toggleTheme } = useTheme()

const NAV = [
  { name: 'home', label: '首页', to: '/' },
  { name: 'posts', label: '文章', to: '/posts' },
  { name: 'tags', label: '标签', to: '/tags' },
  { name: 'projects', label: '项目', to: '/projects' },
  { name: 'about', label: '关于', to: '/about' },
]

const menuOpen = ref(false)

// 换页面时收起移动端菜单，否则点完链接菜单还挂着
watch(() => route.fullPath, () => {
  menuOpen.value = false
})
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink to="/" class="brand" aria-label="回到首页">
        <span class="brand-mark" aria-hidden="true">栢</span>
        <span class="brand-text">
          <strong>张栢焜</strong>
          <small>计算机科学与技术</small>
        </span>
      </RouterLink>

      <nav class="nav" :class="{ 'is-open': menuOpen }" aria-label="主导航">
        <RouterLink
          v-for="item in NAV"
          :key="item.name"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': route.name === item.name }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <button
          type="button"
          class="icon-btn"
          :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          :aria-label="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="currentColor" />
            <g stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
              <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
            </g>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          class="icon-btn menu-btn"
          :aria-expanded="menuOpen"
          aria-label="打开导航菜单"
          @click="menuOpen = !menuOpen"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <g v-if="!menuOpen" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </g>
            <g v-else stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </g>
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(160%) blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-inner {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-decoration: none;
  flex-shrink: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0;
  box-shadow: 0 4px 14px -6px var(--accent);
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text strong {
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.brand-text small {
  font-size: 11.5px;
  color: var(--text-muted);
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}

.nav-link {
  position: relative;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-soft);
  text-decoration: none;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface-2);
}

.nav-link.is-active {
  color: var(--accent);
  font-weight: 600;
}

.nav-link.is-active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 1px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 4px;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text-soft);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.icon-btn:hover {
  color: var(--accent);
  border-color: var(--accent-soft);
}

.menu-btn {
  display: none;
}

@media (max-width: 720px) {
  .menu-btn {
    display: grid;
  }

  .nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 8px;
    margin: 0;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    display: none;
  }

  .nav.is-open {
    display: flex;
  }

  .nav-link {
    padding: 11px 12px;
    font-size: 15px;
  }

  .nav-link.is-active::after {
    display: none;
  }

  .nav-link.is-active {
    background: var(--accent-soft);
  }
}
</style>
