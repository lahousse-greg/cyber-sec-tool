import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { execFile } from 'node:child_process'

type IncomingMessage = import('node:http').IncomingMessage
type ServerResponse = import('node:http').ServerResponse

const KNOWN_BROWSERS = [
  { id: 'chrome', name: 'Google Chrome', app: 'Google Chrome' },
  { id: 'firefox', name: 'Firefox', app: 'Firefox' },
  { id: 'safari', name: 'Safari', app: 'Safari' },
  { id: 'edge', name: 'Microsoft Edge', app: 'Microsoft Edge' },
  { id: 'brave', name: 'Brave Browser', app: 'Brave Browser' },
  { id: 'arc', name: 'Arc', app: 'Arc' },
  { id: 'opera', name: 'Opera', app: 'Opera' },
]

function detectBrowsers(): Array<{ id: string; name: string }> {
  const home = process.env.HOME ?? ''
  return KNOWN_BROWSERS.filter(b =>
    fs.existsSync(`/Applications/${b.app}.app`) ||
    fs.existsSync(`${home}/Applications/${b.app}.app`)
  ).map(({ id, name }) => ({ id, name }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addApiMiddleware(server: { middlewares: any }): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url === '/api/browsers' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ browsers: detectBrowsers() }))
      return
    }

    if (req.url === '/api/open-url' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', () => {
        try {
          const { browserId, url } = JSON.parse(body) as { browserId: unknown; url: unknown }

          let safeUrl: string
          try {
            const parsed = new URL(String(url))
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol')
            safeUrl = parsed.href
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'URL must be http or https' }))
            return
          }

          const browser = KNOWN_BROWSERS.find(b => b.id === String(browserId))
          if (!browser) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Unknown browser' }))
            return
          }

          execFile('open', ['-a', browser.app, safeUrl], err => {
            res.setHeader('Content-Type', 'application/json')
            if (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ ok: false, error: err.message }))
            } else {
              res.end(JSON.stringify({ ok: true }))
            }
          })
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Parse error' }))
        }
      })
      return
    }

    if (req.url === '/api/scan-fields' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const { url } = JSON.parse(body) as { url: unknown }
          let safeUrl: string
          try {
            const parsed = new URL(String(url))
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol')
            safeUrl = parsed.href
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'URL must be http or https' }))
            return
          }

          let playwright: typeof import('playwright')
          try {
            playwright = await import('playwright')
          } catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Playwright not installed — run: npm install playwright' }))
            return
          }

          let browser: import('playwright').Browser | null = null
          try {
            try {
              browser = await playwright.chromium.launch({ channel: 'chrome', headless: true })
            } catch {
              browser = await playwright.chromium.launch({ headless: true })
            }
            const page = await browser.newPage()
            await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
            await page.waitForLoadState('load').catch(() => { /* best-effort */ })

            const fields = await page.evaluate(() => {
              const SELECTOR = 'input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input:not([type]), textarea'
              return Array.from(document.querySelectorAll(SELECTOR)).map((el, i) => {
                const tag = el.tagName.toLowerCase()
                const type = tag === 'textarea' ? 'textarea' : ((el as HTMLInputElement).type || 'text')
                const name = el.getAttribute('name') ?? ''
                const id = el.getAttribute('id') ?? ''
                const placeholder = el.getAttribute('placeholder') ?? ''
                let label = ''
                if (id) {
                  const labelEl = document.querySelector(`label[for="${CSS.escape(id)}"]`)
                  if (labelEl) label = labelEl.textContent?.trim() ?? ''
                }
                if (!label) {
                  const wrapped = el.closest('label')
                  if (wrapped) label = wrapped.textContent?.trim() ?? ''
                }
                if (!label) label = el.getAttribute('aria-label')?.trim() ?? ''
                let selector = ''
                if (id) selector = `#${CSS.escape(id)}`
                else if (name) selector = `${tag}[name="${CSS.escape(name)}"]`
                else selector = `${tag}:nth-of-type(${i + 1})`
                const displayName = label || placeholder || name || id || `Field ${i + 1}`
                return { index: i, type, name, id, placeholder, label, selector, displayName }
              })
            })

            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, fields }))
          } finally {
            await browser?.close()
          }
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
      return
    }

    if (req.url === '/api/inject-field' && req.method === 'POST') {
      let body = ''
      req.on('data', (chunk: Buffer) => { body += chunk.toString() })
      req.on('end', async () => {
        try {
          const { url, selector, payload } = JSON.parse(body) as { url: unknown; selector: unknown; payload: unknown }
          let safeUrl: string
          try {
            const parsed = new URL(String(url))
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('bad protocol')
            safeUrl = parsed.href
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'URL must be http or https' }))
            return
          }

          const safeSelector = String(selector).trim()
          if (!safeSelector) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Selector required' }))
            return
          }

          const safePayload = String(payload)

          let playwright: typeof import('playwright')
          try {
            playwright = await import('playwright')
          } catch {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Playwright not installed — run: npm install playwright' }))
            return
          }

          let browser: import('playwright').Browser | null = null
          try {
            browser = await playwright.chromium.launch({ channel: 'chrome', headless: false })
          } catch {
            browser = await playwright.chromium.launch({ headless: false })
          }

          const page = await browser.newPage()
          await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
          await page.fill(safeSelector, safePayload)
          await page.press(safeSelector, 'Enter')

          // Keep browser open for 60 s so user can observe the result
          setTimeout(() => { browser?.close().catch(() => {}) }, 60_000)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: String(e) }))
        }
      })
      return
    }

    next()
  })
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'browser-launcher',
      configureServer(server) { addApiMiddleware(server) },
      configurePreviewServer(server) { addApiMiddleware(server) },
    },
  ],
})
