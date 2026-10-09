/**
 * 检查移动端是否存在横向溢出。
 * document.scrollWidth 大于视口宽度就说明有元素撑破了布局。
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://127.0.0.1:4173'
const PORT = 9444

const browserPath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p))

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const routes = ['#/', '#/posts', '#/projects', '#/about', '#/posts/kmp-algorithm-notes', '#/tags/算法']
const widths = [360, 390, 768, 1440]

async function main() {
  await mkdir('tmp', { recursive: true })
  const child = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.cwd(), 'tmp', 'overflow-profile')}`,
    '--no-first-run',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
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
          reject(new Error(`${method} 超时`))
        }
      }, 20000)
    })

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)

  const problems = []
  const results = []

  for (const width of widths) {
    for (const route of routes) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      }, sessionId)
      await send('Page.navigate', { url: `${BASE}/${route}` }, sessionId)
      await sleep(1200)

      const { result } = await send('Runtime.evaluate', {
        expression: `(() => {
          const de = document.documentElement
          const offenders = []
          if (de.scrollWidth > de.clientWidth + 1) {
            for (const el of document.querySelectorAll('body *')) {
              const r = el.getBoundingClientRect()
              if (r.width === 0 && r.height === 0) continue
              if (r.right > de.clientWidth + 1 || r.left < -1) {
                offenders.push({
                  tag: el.tagName.toLowerCase(),
                  cls: String(el.className || '').slice(0, 60),
                  left: Math.round(r.left),
                  right: Math.round(r.right),
                  width: Math.round(r.width),
                })
              }
            }
          }
          return {
            scrollWidth: de.scrollWidth,
            clientWidth: de.clientWidth,
            offenders: offenders.slice(0, 6),
          }
        })()`,
        returnByValue: true,
      }, sessionId)

      const v = result.value
      const overflow = v.scrollWidth - v.clientWidth
      const row = { width, route, overflow, offenders: v.offenders }
      results.push(row)
      if (overflow > 1) problems.push(row)
    }
  }

  console.log(JSON.stringify({ problems, checked: results.length }, null, 2))
  ws.close()
  child.kill()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
