import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import { execFile } from 'node:child_process'

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
  server.middlewares.use((req: any, res: any, next: () => void) => {
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
