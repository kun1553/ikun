<script setup>
import { RouterLink } from 'vue-router'
import { posts, tags } from '@/lib/posts'

const skills = [
  {
    group: '编程语言',
    items: ['Java', 'C++', 'JavaScript', 'TypeScript', 'Python', 'SQL'],
  },
  {
    group: '后端',
    items: ['Java Web', 'SSM', 'Spring Boot', 'MyBatis-Plus', 'Redis', 'MySQL', 'Quartz', 'JWT'],
  },
  {
    group: '前端',
    items: ['Vue 3', 'Vite', 'Pinia', 'Vue Router', '原生 CSS', 'Canvas'],
  },
  {
    group: '计算机基础',
    items: ['数据结构与算法', '操作系统', '计算机网络', '数据库原理', '编译原理'],
  },
  {
    group: '工具与环境',
    items: ['Git', 'Linux', 'WSL2', 'Docker', 'Maven', 'IDEA'],
  },
]

const timeline = [
  {
    period: '2024 秋',
    title: '入门编程，第一次写出能跑的程序',
    desc: '从 C 语言开始，在第一门程序设计课上把「编译通过」当成了不起的成就。那时候还不知道指针有多难。',
  },
  {
    period: '2025 春',
    title: '转向 Java 后端，接触第一个完整项目',
    desc: '学了 Spring Boot，第一次写出有数据库、有接口、能在浏览器里访问的东西。也开始认真刷算法题，意识到基础不牢会一直卡着。',
  },
  {
    period: '2025 夏',
    title: '进实验室，第一次做多人协作的项目',
    desc: '参与分布式定时任务调度平台的开发。第一次体会到「代码能跑」和「代码能维护」之间差着多少东西，也第一次被 Code Review 打回重写。',
  },
  {
    period: '2025 秋',
    title: '补前端与工程化，开始写这个博客',
    desc: '课程项目需要自己写前端，从 Vue 3 入手，顺手把构建、打包、部署这条链路走通。写博客是为了对抗「学过就忘」。',
  },
  {
    period: '现在',
    title: '回头补计算机基础',
    desc: '在读《深入理解计算机系统》和《数据库系统概念》。越往上写代码，越发现瓶颈回到了最底层的那些课上。',
  },
]

const faqs = [
  {
    q: '为什么不用 Hexo 或者 Next.js 之类现成的方案？',
    a: '因为这个博客本身就是一次练习。用通用框架确实半小时就能跑起来，但那样我不会去研究 import.meta.glob 怎么在构建期收集文件、Markdown 渲染器怎么自定义规则、hash 路由为什么不需要服务端配置。这些细节只有自己写一遍才会碰到。',
  },
  {
    q: '文章是手写的还是 AI 生成的？',
    a: '都是自己在学习过程中记下来的。踩坑的部分尤其真实，因为那都是当时真的卡住了很久的地方。',
  },
  {
    q: '这个站点是怎么部署的？',
    a: '构建产物就是一堆静态文件，丢到任意静态托管上都能跑。因为用的是 hash 路由，不需要额外配置路径回退规则。',
  },
]

const stats = [
  { label: '篇文章', value: posts.length },
  { label: '个标签', value: tags.length },
  { label: '分钟阅读', value: posts.reduce((sum, post) => sum + post.readingTime, 0) },
]
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <p class="eyebrow">关于</p>
      <h1 class="page-title">关于我</h1>
    </header>

    <section class="intro">
      <div class="intro-card">
        <div class="intro-top">
          <span class="avatar" aria-hidden="true">栢</span>
          <div>
            <h2 class="name">张栢焜</h2>
            <p class="role">计算机科学与技术 · 本科在读</p>
          </div>
        </div>

        <p class="bio">
          我是一名计算机科学与技术专业的本科生，主要方向是后端开发与前端工程化。
          喜欢把一件事从头到尾做完整 —— 从设计表结构、写接口，到把页面调成自己满意的样子。
        </p>

        <p class="bio">
          这个博客开了有一段时间了。写它的初衷很朴素：我发现自己学过的东西忘得特别快，
          一门课考完试，两个月后再问就只剩个模糊印象。后来发现，凡是能用自己的话写清楚的，
          基本就真的记住了；写不清楚的地方，恰恰是当时没搞懂、只是背下来的地方。
        </p>

        <p class="bio">
          所以这里的文章尽量不写「教程体」，更多是记录我怎么想明白一个问题的，
          包括走过的弯路。如果某一篇正好帮你少踩一个坑，那这个博客就值得了。
        </p>

        <div class="intro-stats">
          <div v-for="item in stats" :key="item.label" class="stat">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>

      <aside class="side">
        <div class="side-panel">
          <h3 class="side-title">目前的状态</h3>
          <ul class="facts">
            <li><span>方向</span><strong>后端开发 / 前端工程化</strong></li>
            <li><span>正在学</span><strong>CSAPP、分布式基础</strong></li>
            <li><span>正在写</span><strong>离线优先笔记应用</strong></li>
            <li><span>常用语言</span><strong>Java / TypeScript</strong></li>
          </ul>
        </div>

        <div class="side-panel">
          <h3 class="side-title">想聊的话</h3>
          <p class="side-text">
            对文章里的内容有疑问，或者发现了写错的地方，都欢迎告诉我。
            技术上的错误被指出来是好事。
          </p>
          <RouterLink to="/posts" class="side-link">去看看文章 →</RouterLink>
        </div>
      </aside>
    </section>

    <section class="block">
      <h2 class="block-title">技能栈</h2>
      <p class="block-sub">按自己实际用过、能讲清楚原理的标准来列，不堆名词。</p>

      <div class="skill-grid">
        <div v-for="group in skills" :key="group.group" class="skill-group">
          <h3 class="skill-group-title">{{ group.group }}</h3>
          <div class="skill-items">
            <span v-for="item in group.items" :key="item" class="skill">{{ item }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="block">
      <h2 class="block-title">学习路径</h2>
      <p class="block-sub">按时间顺序，记一下自己是怎么一步步走到这里的。</p>

      <ol class="timeline">
        <li v-for="item in timeline" :key="item.period" class="timeline-item">
          <div class="timeline-dot" aria-hidden="true" />
          <div class="timeline-body">
            <span class="timeline-period">{{ item.period }}</span>
            <h3 class="timeline-title">{{ item.title }}</h3>
            <p class="timeline-desc">{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </section>

    <section class="block">
      <h2 class="block-title">常见问题</h2>
      <div class="faqs">
        <details v-for="faq in faqs" :key="faq.q" class="faq">
          <summary>{{ faq.q }}</summary>
          <p>{{ faq.a }}</p>
        </details>
      </div>
    </section>
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
  margin: 0;
  font-size: clamp(26px, 3.6vw, 36px);
  font-weight: 700;
  letter-spacing: -0.015em;
}

/* ---------- 简介 ---------- */
.intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 286px;
  gap: 28px;
  align-items: start;
}

.intro-card {
  padding: 28px 30px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
}

.intro-top {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.avatar {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex-shrink: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  font-size: 27px;
  font-weight: 700;
  box-shadow: 0 10px 26px -14px var(--accent);
}

.name {
  margin: 0 0 5px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.role {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-muted);
}

.bio {
  margin: 18px 0 0;
  font-size: 14.8px;
  line-height: 1.95;
  color: var(--text-soft);
}

.intro-stats {
  display: flex;
  gap: 34px;
  margin-top: 26px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
}

.stat strong {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

.stat span {
  font-size: 12.3px;
  color: var(--text-muted);
}

.side {
  display: grid;
  gap: 16px;
  position: sticky;
  top: 88px;
}

.side-panel {
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.side-title {
  margin: 0 0 14px;
  font-size: 13.5px;
  font-weight: 650;
}

.facts {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.facts li {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.facts span {
  font-size: 11.8px;
  color: var(--text-muted);
}

.facts strong {
  font-size: 13.6px;
  font-weight: 550;
  color: var(--text-soft);
}

.side-text {
  margin: 0 0 12px;
  font-size: 13.4px;
  line-height: 1.8;
  color: var(--text-soft);
}

.side-link {
  font-size: 13px;
  color: var(--accent);
  text-decoration: none;
}

.side-link:hover {
  text-decoration: underline;
}

/* ---------- 通用区块 ---------- */
.block {
  margin-top: 54px;
}

.block-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 680;
}

.block-sub {
  margin: 0 0 22px;
  font-size: 13.5px;
  color: var(--text-muted);
}

/* ---------- 技能 ---------- */
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.skill-group {
  padding: 18px 20px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.skill-group-title {
  margin: 0 0 13px;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: 0.06em;
  color: var(--accent);
}

.skill-items {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.skill {
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--surface-2);
  font-size: 12.6px;
  color: var(--text-soft);
}

/* ---------- 时间线 ---------- */
.timeline {
  margin: 0;
  padding: 0 0 0 6px;
  list-style: none;
  display: grid;
  gap: 4px;
}

.timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 16px;
  padding-bottom: 24px;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 16px;
  bottom: 0;
  width: 1px;
  background: var(--border);
}

.timeline-dot {
  width: 11px;
  height: 11px;
  margin-top: 5px;
  margin-left: 5px;
  border-radius: 50%;
  background: var(--bg);
  border: 2px solid var(--accent);
  z-index: 1;
}

.timeline-body {
  padding-top: 1px;
}

.timeline-period {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.8px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.timeline-title {
  margin: 9px 0 6px;
  font-size: 16px;
  font-weight: 620;
  line-height: 1.5;
}

.timeline-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-soft);
}

/* ---------- FAQ ---------- */
.faqs {
  display: grid;
  gap: 10px;
}

.faq {
  padding: 15px 18px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.faq summary {
  cursor: pointer;
  font-size: 14.4px;
  font-weight: 570;
  color: var(--text);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 10px;
}

.faq summary::-webkit-details-marker {
  display: none;
}

.faq summary::before {
  content: '+';
  flex-shrink: 0;
  width: 18px;
  text-align: center;
  color: var(--accent);
  font-weight: 700;
}

.faq[open] summary::before {
  content: '−';
}

.faq p {
  margin: 12px 0 0 28px;
  font-size: 13.8px;
  line-height: 1.85;
  color: var(--text-soft);
}

@media (max-width: 940px) {
  .intro {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
  }
}

@media (max-width: 560px) {
  .page {
    padding-top: 34px;
  }

  .intro-card {
    padding: 22px 20px;
  }

  .intro-stats {
    gap: 22px;
  }
}
</style>
