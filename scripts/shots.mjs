/** 按名称截取指定页面（deviceScaleFactor=1，避免移动端模拟下的截图伪影） */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const OUT = process.argv[3] || '.verify'
const PORT = 9466
const browserPath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// [名称, 路由, 宽, 高, 主题, 是否整页截图]
const shots = [
  ['mobile-home', '#/', 390, 844, 'light', true],
  ['mobile-post', '#/posts/kmp-algorithm-notes', 390, 844, 'light', true],
  ['light-home', '#/', 1440, 900, 'light', true],
  ['light-projects', '#/projects', 1440, 900, 'light', true],
  ['light-about', '#/about', 1440, 900, 'light', true],
  ['light-posts', '#/posts', 1440, 900, 'light', true],
  ['light-tags', '#/tags', 1440, 900, 'light', true],
  ['light-post-redis', '#/posts/redis-practice-notes', 1440, 900, 'light', true],
  ['dark-post', '#/posts/mysql-index-optimization', 1440, 900, 'dark', true],
  ['dark-post-ssm', '#/posts/ssm-framework-notes', 1440, 900, 'dark', true],
]

async function main() {
  await mkdir(OUT, { recursive: true })

  const child = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.cwd(), 'tmp', 'shot-profile')}`,
    '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'ignore' })

  let version = null
  for (let i = 0; i < 40; i += 1) {
    try {
      version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
      break
    } catch {
      await sleep(250)
    }
  }
  if (!version) throw new Error('调试端口未就绪')

  const ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })

  let id = 1
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id)
      pending.delete(m.id)
      m.error ? reject(new Error(m.error.message)) : resolve(m.result)
    }
  })
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const myId = id++
      pending.set(myId, { resolve, reject })
      ws.send(JSON.stringify({ id: myId, method, params, ...(sessionId ? { sessionId } : {}) }))
      setTimeout(() => {
        if (pending.has(myId)) {
          pending.delete(myId)
          reject(new Error(`${method} timeout`))
        }
      }, 25000)
    })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)

  const done = []

  for (const [name, route, width, height, theme, fullPage] of shots) {
    await send('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false }, sessionId)
    await send('Page.navigate', { url: `${BASE}/${route}` }, sessionId)
    await sleep(1600)

    // 主题由 localStorage 决定，先强制写入再等样式重算
    await send('Runtime.evaluate', {
      expression: `localStorage.setItem('theme', ${JSON.stringify(theme)}); document.documentElement.dataset.theme = ${JSON.stringify(theme)};`,
    }, sessionId)
    await sleep(500)

    if (fullPage) {
      const { result } = await send('Runtime.evaluate', {
        expression: `Math.min(document.documentElement.scrollHeight, 7000)`,
        returnByValue: true,
      }, sessionId)
      const full = Math.ceil(result.value)
      await send('Emulation.setDeviceMetricsOverride',
        { width, height: full, deviceScaleFactor: 1, mobile: false }, sessionId)
      await sleep(600)
    }

    const shot = await send('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true }, sessionId)
    await writeFile(join(OUT, `${name}.png`), Buffer.from(shot.data, 'base64'))
    done.push(name)
  }

  console.log('已生成截图:', done.join(', '))
  ws.close()
  child.kill()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
