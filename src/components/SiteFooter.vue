<script setup>
import { RouterLink } from 'vue-router'
import { posts } from '@/lib/posts'

const year = new Date().getFullYear()

const links = [
  { label: '首页', to: '/' },
  { label: '文章', to: '/posts' },
  { label: '标签', to: '/tags' },
  { label: '项目', to: '/projects' },
  { label: '关于', to: '/about' },
]
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <div class="footer-title">张栢焜</div>
        <p class="footer-desc">
          计算机科学与技术。这里记录算法、后端与前端工程化的学习过程，
          写下来的东西才是真的想明白了的东西。
        </p>
      </div>

      <div class="footer-col">
        <h4>导航</h4>
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="footer-link">
          {{ link.label }}
        </RouterLink>
      </div>

      <div class="footer-col">
        <h4>站点</h4>
        <span class="footer-static">共 {{ posts.length }} 篇文章</span>
        <span class="footer-static">Vue 3 + Vite 构建</span>
        <span class="footer-static">Markdown 驱动</span>
      </div>
    </div>

    <div class="container footer-bottom">
      <span>© {{ year }} 张栢焜 · 保留所有权利</span>
      <span class="footer-meta">用 Vue 3 手写，没有套现成主题</span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 72px;
  padding-top: 40px;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.footer-inner {
  display: grid;
  grid-template-columns: 1.6fr 1fr 1fr;
  gap: 32px;
  padding-bottom: 32px;
}

.footer-title {
  font-size: 17px;
  font-weight: 650;
  margin-bottom: 10px;
  color: var(--text);
}

.footer-desc {
  margin: 0;
  max-width: 42ch;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--text-muted);
}

.footer-col {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.footer-col h4 {
  margin: 0 0 3px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.footer-link {
  font-size: 13.5px;
  color: var(--text-soft);
  text-decoration: none;
  width: fit-content;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: var(--accent);
}

.footer-static {
  font-size: 13.5px;
  color: var(--text-soft);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 18px 0 28px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .footer-inner {
    grid-template-columns: 1fr 1fr;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}
</style>
