export interface ParsedURL {
  base: string
  params: Record<string, string>
  isValid: boolean
  error?: string
}

export function parseURL(raw: string): ParsedURL {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { base: '', params: {}, isValid: false, error: 'URL is empty' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    // Try prepending https:// for bare hostnames
    try {
      url = new URL('https://' + trimmed)
    } catch {
      return { base: '', params: {}, isValid: false, error: 'Invalid URL' }
    }
  }

  const params: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  const base = url.origin + url.pathname

  return { base, params, isValid: true }
}

export function buildTestURL(base: string, originalParams: Record<string, string>, targetParam: string, payload: string): string {
  const url = new URL(base)
  Object.entries(originalParams).forEach(([key, value]) => {
    url.searchParams.set(key, key === targetParam ? payload : value)
  })
  if (!(targetParam in originalParams)) {
    url.searchParams.set(targetParam, payload)
  }
  return url.toString()
}
