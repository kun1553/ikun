/**
 * 用无头 Chrome 走一遍站点：检查控制台报错、请求失败、异常，
 * 并用显式断言核对关键内容（而不是只看元素存不存在）。
 *
 * 用法：node scripts/check-pages.mjs --base http://127.0.0.1:4173 --out .verify
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, index, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[index + 1]])
    return pairs
  }, []),
)

const BASE = args.base || 'http://127.0.0.1:4173'
const OUT = args.out || '.verify'
const PORT = 9333
const SHOTS = args.shots !== 'false' && args.shots !== '0'

/**
 * 文章总数从内容目录推导，避免每新写一篇就要回来改一次断言。
 * 带 draft: true 的文章不会出现在站点上，这里同样排除。
 */
const POSTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'posts')
const postCount = readdirSync(POSTS_DIR)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => !/^draft:\s*true\s*$/m.test(readFileSync(join(POSTS_DIR, file), 'utf8')))
  .length

const browserPath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find((path) => existsSync(path))

if (!browserPath) {
  console.error('找不到 Chrome 或 Edge')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 每条路由除了「页面里出现某些文字」，还允许带一段返回 [标签, 布尔] 数组的断言脚本。
 * 断言能抓到「元素在但内容是空的」这类只看文本抓不到的问题。
 */
const routes = [
  {
    hash: '#/',
    name: 'home',
    expect: ['你好，我是', '精选文章', '标签云'],
    assert: `(() => {
      const cards = document.querySelectorAll('.post-card')
      return [
        ['卡片数 >= 6', cards.length >= 6],
        ['统计数字已渲染', !!document.querySelector('.hero-stats .stat dt')],
        ['首屏没有空标题卡片', [...cards].every(c => c.querySelector('.card-title a').textContent.trim().length > 0)],
      ]
    })()`,
  },
  {
    hash: '#/posts',
    name: 'posts',
    expect: ['写作归档'],
    assert: `(() => {
      const cards = document.querySelectorAll('.post-card')
      return [
        [postCount + ' 张文章卡片', cards.length === postCount],
        ['按年份分组', document.querySelectorAll('.year-group').length >= 1],
        ['筛选按钮已渲染', document.querySelectorAll('.filter-chip').length >= 10],
      ]
    })()`,
  },
  {
    hash: '#/tags',
    name: 'tags',
    expect: ['按标签浏览'],
    assert: `(() => {
      const pills = document.querySelectorAll('.cloud .tag-pill')
      return [
        ['标签数 >= 15', pills.length >= 15],
        ['标签明细行数一致', document.querySelectorAll('.tag-row').length === pills.length],
        ['每个标签都有 href', [...pills].every(a => a.getAttribute('href').startsWith('#/tags/'))],
      ]
    })()`,
  },
  {
    hash: '#/projects',
    name: 'projects',
    expect: ['做过的东西'],
    assert: `(() => {
      const links = [...document.querySelectorAll('.related-link')]
      return [
        ['6 个项目', document.querySelectorAll('.project').length === 6],
        ['5 条相关文章链接（1 个项目没有关联文章）', links.length === 5],
        ['相关文章标题非空', links.every(a => a.textContent.replace('相关文章：','').replace('→','').trim().length > 2)],
        ['相关文章 href 无 undefined', links.every(a => !a.getAttribute('href').includes('undefined'))],
      ]
    })()`,
  },
  {
    hash: '#/about',
    name: 'about',
    expect: ['关于我', '学习路径', '常见问题'],
    assert: `(() => [
      ['5 个技能分组', document.querySelectorAll('.skill-group').length === 5],
      ['时间线 >= 5 项', document.querySelectorAll('.timeline-item').length >= 5],
      ['FAQ 可展开', document.querySelectorAll('details.faq').length === 3],
    ])()`,
  },
  {
    hash: '#/posts/kmp-algorithm-notes',
    name: 'post-kmp',
    expect: ['KMP', '目录', 'next'],
    assert: `(() => {
      const codeBlocks = document.querySelectorAll('.markdown pre > code')
      const highlighted = document.querySelectorAll('.markdown pre code .hljs-keyword')
      return [
        ['代码块 >= 3', codeBlocks.length >= 3],
        ['代码已高亮', highlighted.length > 3],
        ['目录项 >= 5', document.querySelectorAll('.toc-list li').length >= 5],
        ['目录锚点都存在', [...document.querySelectorAll('.toc-list a')].every(a => document.querySelector(a.getAttribute('href')))],
        ['上下篇都在', document.querySelectorAll('.post-nav .nav-item:not(.is-empty)').length === 2],
        ['相关文章非空', [...document.querySelectorAll('.related .card-title a')].every(a => a.textContent.trim().length > 0)],
      ]
    })()`,
  },
  {
    hash: '#/posts/mysql-index-optimization',
    name: 'post-mysql',
    expect: ['慢查询'],
    assert: `(() => [
      ['SQL 代码块已高亮', document.querySelectorAll('.markdown pre code .hljs-keyword, .markdown pre code .hljs-comment').length > 2],
      ['有真实表格', document.querySelectorAll('.markdown table').length >= 1],
      ['表格渲染出表头', document.querySelectorAll('.markdown thead th').length >= 5],
    ])()`,
  },
  {
    hash: '#/posts/reading-notes-csapp',
    name: 'post-csapp',
    expect: ['内存'],
    assert: `(() => [
      ['C 代码块已高亮', document.querySelectorAll('.markdown pre code .hljs-meta, .markdown pre code .hljs-keyword').length > 2],
    ])()`,
  },
  {
    hash: '#/tags/算法',
    name: 'tag-algorithm',
    expect: ['算法'],
    assert: `(() => [
      ['列出该标签下的文章', document.querySelectorAll('.post-card').length >= 1],
      ['侧栏有常一起出现的标签', document.querySelectorAll('.sibling-list .tag-pill').length >= 1],
    ])()`,
  },
  {
    hash: '#/nope-does-not-exist',
    name: 'notfound',
    expect: ['404', '这个页面不存在'],
    assert: `(() => [
      ['给出 3 篇推荐', document.querySelectorAll('.suggest-item').length === 3],
    ])()`,
  },
]

async function main() {
  await mkdir(OUT, { recursive: true })

  const child = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.cwd(), 'tmp', 'check-profile')}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' })

  let version = null
  for (let i = 0; i < 40 && !version; i += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
    } catch {
      await sleep(250)
    }
  }
  if (!version) {
    child.kill()
    throw new Error('Chrome 调试端口没有起来')
  }

  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let nextId = 1
  const pending = new Map()
  const events = []

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    } else if (msg.method) {
      events.push(msg)
    }
  })

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id)
          reject(new Error(`${method} 超时`))
        }
      }, 30000)
    })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Log.enable', {}, sessionId)
  await send('Network.enable', {}, sessionId)

  const report = []
  let failed = 0

  for (const route of routes) {
    events.length = 0

    await send('Emulation.setDeviceMetricsOverride',
      { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)
    await send('Page.navigate', { url: `${BASE}/${route.hash}` }, sessionId)
    await sleep(1500)

    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const de = document.documentElement
        return {
          title: document.title,
          text: document.body.innerText,
          overflow: de.scrollWidth - de.clientWidth,
        }
      })()`,
      returnByValue: true,
    }, sessionId)

    const { result: assertions } = await send('Runtime.evaluate', {
      expression: route.assert, returnByValue: true,
    }, sessionId)

    const missing = route.expect.filter((needle) => !result.value.text.includes(needle))
    const failedChecks = (assertions.value || [])
      .filter(([, ok]) => !ok)
      .map(([label]) => label)

    const consoleErrors = events
      .filter((e) => e.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(e.params.type))
      .map((e) => e.params.args.map((a) => a.value ?? a.description ?? '').join(' '))

    const failedRequests = events
      .filter((e) => e.method === 'Network.loadingFailed')
      .map((e) => e.params.errorText)

    const exceptions = events
      .filter((e) => e.method === 'Runtime.exceptionThrown')
      .map((e) => e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)

    const ok = !missing.length && !failedChecks.length && !consoleErrors.length &&
      !failedRequests.length && !exceptions.length && result.value.overflow <= 1
    if (!ok) failed += 1

    report.push({
      route: route.hash,
      ok,
      title: result.value.title,
      overflow: result.value.overflow,
      missingText: missing,
      failedChecks,
      consoleErrors,
      failedRequests,
      exceptions,
    })

    // 整页截图（--shots false 可以跳过，只做断言）
    if (SHOTS) {
      const { result: heightResult } = await send('Runtime.evaluate', {
        expression: `Math.min(document.documentElement.scrollHeight, 7000)`,
        returnByValue: true,
      }, sessionId)
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440, height: Math.ceil(heightResult.value), deviceScaleFactor: 1, mobile: false,
      }, sessionId)
      await sleep(500)
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
      await writeFile(join(OUT, `${route.name}-desktop.png`), Buffer.from(shot.data, 'base64'))
    }
  }

  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2), 'utf8')

  console.log(`\n共检查 ${report.length} 条路由，失败 ${failed} 条\n`)
  for (const row of report) {
    const mark = row.ok ? 'PASS' : 'FAIL'
    console.log(`${mark}  ${row.route.padEnd(34)} ${row.title}`)
    if (!row.ok) {
      if (row.missingText.length) console.log(`      缺少文本: ${row.missingText.join(' / ')}`)
      if (row.failedChecks.length) console.log(`      断言失败: ${row.failedChecks.join(' / ')}`)
      if (row.overflow > 1) console.log(`      横向溢出: ${row.overflow}px`)
      if (row.consoleErrors.length) console.log(`      控制台: ${row.consoleErrors.join(' | ')}`)
      if (row.failedRequests.length) console.log(`      请求失败: ${row.failedRequests.join(' | ')}`)
      if (row.exceptions.length) console.log(`      异常: ${row.exceptions.join(' | ')}`)
    }
  }

  ws.close()
  child.kill()
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('检查失败:', error)
  process.exit(1)
})
