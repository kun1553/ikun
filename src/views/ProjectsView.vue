<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getPostById } from '@/lib/posts'

/**
 * 项目清单。写成静态数据而不是从 Markdown 里解析，
 * 是因为项目的字段结构和文章差别较大，硬塞进同一套解析逻辑反而更难维护。
 */
const projects = [
  {
    id: 'task-scheduler',
    name: '分布式定时任务调度平台',
    tagline: '把散落在各服务里的定时任务收拢到一处统一调度',
    category: '实验室项目',
    period: '2025.03 – 2025.07',
    status: '已上线',
    summary:
      '实验室的几台服务器上原本用 crontab 散着十几个脚本，改一次配置要挨个登录，出了问题也没人知道。这个平台把任务定义、触发、执行和日志集中起来管理。',
    stack: ['Java', 'Spring Boot', 'Quartz', 'Redis', 'MySQL', 'Netty'],
    highlights: [
      '用 Redis 的 SETNX 加过期时间实现调度器选主，主节点挂了从节点会在 15 秒内接管',
      '支持 cron 表达式与固定频率两种触发方式，任务配置改动实时生效，不需要重启服务',
      '执行日志按任务分片存储，配合分页查询接口，单任务保留最近 30 天记录',
      '接入告警：任务连续失败 3 次推送到企业微信机器人',
    ],
    metrics: [
      { label: '接管的任务数', value: '20+' },
      { label: '调度延迟', value: '< 200ms' },
    ],
    relatedPostId: 'springboot-course-project',
  },
  {
    id: 'campus-market',
    name: '校园二手交易平台',
    tagline: '课程设计，也是我第一次完整走完前后端分离的全流程',
    category: '课程项目',
    period: '2025.09 – 2025.11',
    status: '已结课',
    summary:
      '一个面向校内学生的二手物品交易平台。用户发布商品、按分类检索、站内私信沟通、线下交易并互相评价。这个项目让我真正理解了事务边界、缓存一致性和接口幂等这些平时只在书上看到的概念。',
    stack: ['Spring Boot', 'MyBatis-Plus', 'Redis', 'MySQL', 'JWT', 'Vue 3'],
    highlights: [
      'JWT 无状态鉴权，token 双令牌设计（access + refresh），refresh token 存 Redis 支持主动踢下线',
      '热点商品详情用 Redis 缓存，采用「先更新数据库再删除缓存」并加延迟双删，压测下未出现脏读',
      '下单接口用「用户 id + 商品 id + 时间窗」生成唯一键做幂等，挡住重复提交',
      '商品表按分类和状态建立了联合索引，列表接口从 1.2 秒降到 90 毫秒',
    ],
    metrics: [
      { label: '数据表', value: '12 张' },
      { label: '接口数', value: '46 个' },
    ],
    relatedPostId: 'mysql-index-optimization',
  },
  {
    id: 'string-match-visualizer',
    name: '字符串匹配算法可视化',
    tagline: '把 KMP 的 next 数组推导过程画出来',
    category: '个人项目',
    period: '2025.10',
    status: '持续维护',
    summary:
      '学 KMP 的时候怎么都想不明白 next 数组为什么要那样回退，于是干脆写了个可视化工具，单步展示暴力匹配、KMP 和 Boyer-Moore 三种算法的比较过程，每一轮的指针位置和已匹配长度都标出来。',
    stack: ['Vue 3', 'TypeScript', 'Canvas', 'Vite'],
    highlights: [
      '支持三种算法并排对比，同一组输入下直观看出比较次数的差距',
      '单步 / 连续播放 / 回退三种模式，回退靠记录状态快照实现',
      '文本与模式串可自定义，内置若干让暴力匹配退化成 O(n·m) 的对抗样例',
      '纯前端实现，没有后端依赖，构建产物不到 200KB',
    ],
    metrics: [
      { label: '内置算法', value: '3 种' },
      { label: '产物体积', value: '< 200KB' },
    ],
    relatedPostId: 'kmp-algorithm-notes',
  },
  {
    id: 'note-pwa',
    name: '离线优先的笔记应用',
    tagline: '断网也能写，联网后自动同步',
    category: '个人项目',
    period: '2025.12 – 至今',
    status: '开发中',
    summary:
      '起因是经常在没网的地方想记点东西。这个应用把数据先写进 IndexedDB，网络恢复后再与后端做增量同步。正在啃冲突解决策略，目前用的是「按最后修改时间取新」，但对同一段文字的并发编辑还不够好。',
    stack: ['Vue 3', 'Pinia', 'IndexedDB', 'Service Worker', 'Node.js'],
    highlights: [
      'Service Worker 缓存应用外壳，首屏离线可用',
      '编辑操作先落本地队列，联网后按序重放，失败自动重试',
      '用 updated_at 做乐观并发控制，同步冲突时保留双方版本供手动选择',
      '虚拟滚动渲染长列表，一万条笔记下滚动仍然流畅',
    ],
    metrics: [
      { label: '离线可用', value: '是' },
      { label: '长列表', value: '1w 条流畅' },
    ],
    relatedPostId: null,
  },
  {
    id: 'ui-kit',
    name: '个人 Vue 组件库',
    tagline: '把反复写的那些组件收起来',
    category: '个人项目',
    period: '2025.08 – 至今',
    status: '持续维护',
    summary:
      '做几个课程项目时发现按钮、弹窗、表格这些组件每次都要重写一遍，于是抽出来做成组件库。不是为了替代 Element Plus，只是想搞明白一个组件库从写组件到打包发布到底要解决哪些问题。',
    stack: ['Vue 3', 'Vite', 'Vitest', 'CSS Variables'],
    highlights: [
      '用 CSS 变量做主题，切换深色模式不需要重新渲染组件',
      '基于 Vite 库模式打包，输出 ESM 与 UMD 两套产物并附带类型声明',
      '按需引入：每个组件独立入口，避免整包引入',
      '用 Vitest + @vue/test-utils 覆盖核心组件的交互逻辑',
    ],
    metrics: [
      { label: '组件数', value: '18 个' },
      { label: '测试覆盖', value: '76%' },
    ],
    relatedPostId: 'vue3-vite-blog',
  },
  {
    id: 'algorithm-notes',
    name: '算法题解与模板仓库',
    tagline: '刷题记录，以及自己整理的可复用模板',
    category: '个人项目',
    period: '2024.09 – 至今',
    status: '持续更新',
    summary:
      '刷题过程中的题解和模板沉淀。不是简单贴代码，每道题都会写清楚思路来源、复杂度分析和自己第一次写错的地方。按专题分了图论、动态规划、字符串、数论等目录。',
    stack: ['C++', 'Java', 'Markdown'],
    highlights: [
      '按专题组织的目录结构，配一份索引方便检索',
      '每道题附 C++ 与 Java 双语言实现，方便对照语法差异',
      '整理了一套竞赛常用模板：并查集、线段树、拓扑排序、二分答案',
      '记录了 30 多个自己踩过的边界条件坑',
    ],
    metrics: [
      { label: '题解', value: '210+ 篇' },
      { label: '专题', value: '9 个' },
    ],
    relatedPostId: 'kmp-algorithm-notes',
  },
]

const categories = computed(() => ['全部', ...new Set(projects.map((p) => p.category))])
const activeCategory = ref('全部')

const visible = computed(() =>
  activeCategory.value === '全部'
    ? projects
    : projects.filter((project) => project.category === activeCategory.value),
)

/*
 * 名字里不要带 v-for 的循环变量（这里原来是 relatedPost，和 `project` 无关但
 * 和模板里的表达式同名容易踩坑），显式接收 project 参数最稳妥。
 */
const relatedPostOf = (project) =>
  project.relatedPostId ? getPostById(project.relatedPostId) : null
</script>

<template>
  <div class="container page">
    <header class="page-head">
      <p class="eyebrow">项目</p>
      <h1 class="page-title">做过的东西</h1>
      <p class="page-desc">
        实验室项目、课程设计和个人折腾。下面每一项都写了当时的取舍和踩到的坑，
        感兴趣的话可以顺着关联文章看更细的实现过程。
      </p>
    </header>

    <div class="filters">
      <button
        v-for="category in categories"
        :key="category"
        type="button"
        class="filter-chip"
        :class="{ 'is-active': activeCategory === category }"
        @click="activeCategory = category"
      >
        {{ category }}
      </button>
    </div>

    <div class="projects">
      <article v-for="project in visible" :key="project.id" class="project">
        <header class="project-head">
          <div class="project-heading">
            <h2 class="project-name">{{ project.name }}</h2>
            <p class="project-tagline">{{ project.tagline }}</p>
          </div>
          <div class="project-badges">
            <span class="chip category">{{ project.category }}</span>
            <span class="chip period">{{ project.period }}</span>
            <span class="chip status" :class="{ ongoing: project.status === '开发中' || project.status === '持续维护' || project.status === '持续更新' }">
              {{ project.status }}
            </span>
          </div>
        </header>

        <p class="project-summary">{{ project.summary }}</p>

        <div class="project-body">
          <div class="project-col">
            <h3 class="sub-title">技术栈</h3>
            <div class="stack">
              <span v-for="tech in project.stack" :key="tech" class="tech">{{ tech }}</span>
            </div>
          </div>

          <div class="project-col">
            <h3 class="sub-title">关键实现</h3>
            <ul class="highlights">
              <li v-for="item in project.highlights" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>

        <footer class="project-foot">
          <div class="metrics">
            <div v-for="metric in project.metrics" :key="metric.label" class="metric">
              <strong>{{ metric.value }}</strong>
              <span>{{ metric.label }}</span>
            </div>
          </div>

          <RouterLink
            v-if="relatedPostOf(project)"
            :to="`/posts/${relatedPostOf(project).id}`"
            class="related-link"
          >
            相关文章：{{ relatedPostOf(project).title }} →
          </RouterLink>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 48px 0 0;
}

.page-head {
  margin-bottom: 26px;
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
  max-width: 64ch;
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-soft);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 26px;
}

.filter-chip {
  height: 31px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text-soft);
  font-size: 13px;
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

.projects {
  display: grid;
  gap: 20px;
}

.project {
  padding: 24px 26px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.project:hover {
  border-color: var(--accent-soft);
  box-shadow: var(--shadow);
}

.project-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.project-name {
  margin: 0 0 6px;
  font-size: 19px;
  font-weight: 680;
  letter-spacing: -0.005em;
}

.project-tagline {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-muted);
}

.project-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11.8px;
  line-height: 1.5;
  white-space: nowrap;
}

.category {
  color: var(--accent);
  background: var(--accent-soft);
  font-weight: 600;
}

.period {
  color: var(--text-muted);
  background: var(--surface-2);
  font-variant-numeric: tabular-nums;
}

.status {
  color: var(--text-soft);
  border: 1px solid var(--border);
}

.status.ongoing {
  color: var(--ok);
  border-color: color-mix(in srgb, var(--ok) 40%, transparent);
  background: color-mix(in srgb, var(--ok) 10%, transparent);
}

.project-summary {
  margin: 16px 0 0;
  font-size: 14.3px;
  line-height: 1.85;
  color: var(--text-soft);
}

.project-body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 26px;
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px dashed var(--border);
}

.sub-title {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tech {
  padding: 3px 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface-2);
  font-size: 12px;
  color: var(--text-soft);
  font-family: var(--font-mono);
}

.highlights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 9px;
}

.highlights li {
  position: relative;
  padding-left: 18px;
  font-size: 13.8px;
  line-height: 1.75;
  color: var(--text-soft);
}

.highlights li::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 9px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  opacity: 0.75;
}

.project-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
}

.metrics {
  display: flex;
  gap: 28px;
}

.metric strong {
  display: block;
  font-size: 16.5px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.metric span {
  font-size: 11.8px;
  color: var(--text-muted);
}

.related-link {
  font-size: 13.2px;
  color: var(--accent);
  text-decoration: none;
}

.related-link:hover {
  text-decoration: underline;
}

@media (max-width: 720px) {
  .page {
    padding-top: 34px;
  }

  .project {
    padding: 20px;
  }

  .project-body {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .metrics {
    gap: 20px;
  }
}
</style>
