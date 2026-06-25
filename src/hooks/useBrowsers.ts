import { useState, useEffect } from 'react'

export interface Browser {
  id: string
  name: string
}

export function useBrowsers() {
  const [browsers, setBrowsers] = useState<Browser[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [apiAvailable, setApiAvailable] = useState(false)

  useEffect(() => {
    fetch('/api/browsers')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { browsers: Browser[] }) => {
        if (data.browsers.length > 0) {
          setBrowsers(data.browsers)
          setSelected(data.browsers[0].id)
          setApiAvailable(true)
        }
      })
      .catch(() => { /* API unavailable — open button falls back to window.open */ })
  }, [])

  const openInBrowser = async (url: string): Promise<void> => {
    if (!apiAvailable || !selected) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const res = await fetch('/api/open-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserId: selected, url }),
      })
      const data = await res.json() as { ok: boolean }
      if (!data.ok) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return { browsers, selected, setSelected, apiAvailable, openInBrowser }
}
