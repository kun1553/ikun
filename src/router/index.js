import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 用 hash 路由（URL 里带 #）而不是 history 路由。
 * 原因是这个站点会被直接丢到静态托管上，hash 路由不需要服务端配置
 * 「未命中的路径一律回退到 index.html」，部署最省心。
 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/posts',
    name: 'posts',
    component: () => import('@/views/PostsView.vue'),
    meta: { title: '文章' },
  },
  {
    path: '/posts/:id',
    name: 'post',
    component: () => import('@/views/PostView.vue'),
    props: true,
    meta: { title: '文章详情' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/TagsView.vue'),
    meta: { title: '标签' },
  },
  {
    path: '/tags/:tag',
    name: 'tag',
    component: () => import('@/views/TagView.vue'),
    props: true,
    meta: { title: '标签' },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { title: '项目' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: { title: '关于' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) {
      return { el: to.hash, top: 88, behavior: 'smooth' }
    }
    return { top: 0 }
  },
})

const SITE_NAME = '张栢焜的博客'

router.afterEach((to) => {
  const title = to.meta?.title
  document.title = title && to.name !== 'home' ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · 计算机科学与技术`
})

export default router
