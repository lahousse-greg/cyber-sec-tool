export interface HPPStrategy {
  id: string
  name: string
  description: string
  // How the backend typically handles this — which value "wins"
  backendBehavior: string
  buildURL: (base: string, params: Record<string, string>, targetParam: string, injectValue: string) => string
}

function encodeParam(value: string): string {
  return encodeURIComponent(value)
}

function buildBase(base: string, params: Record<string, string>, skip: string): string {
  const entries = Object.entries(params).filter(([k]) => k !== skip)
  if (entries.length === 0) return base
  const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeParam(v)}`).join('&')
  return `${base}?${qs}`
}

export const HPP_STRATEGIES: HPPStrategy[] = [
  {
    id: 'append',
    name: 'Append duplicate',
    description: 'Adds the injected value as a second occurrence of the parameter after the original.',
    backendBehavior: 'PHP/Apache use last value. Django, ASP.NET, Node/Express use first. Some concatenate.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const orig = encodeParam(params[targetParam] ?? '')
      return `${prefix}${sep}${encodeURIComponent(targetParam)}=${orig}&${encodeURIComponent(targetParam)}=${encodeParam(injectValue)}`
    },
  },
  {
    id: 'prepend',
    name: 'Prepend duplicate',
    description: 'Places the injected value before the original so it appears first in the query string.',
    backendBehavior: 'Frameworks that use the first occurrence (Node/Express, ASP.NET Classic) will pick up the injected value.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const orig = encodeParam(params[targetParam] ?? '')
      return `${prefix}${sep}${encodeURIComponent(targetParam)}=${encodeParam(injectValue)}&${encodeURIComponent(targetParam)}=${orig}`
    },
  },
  {
    id: 'array-bracket',
    name: 'Array bracket notation',
    description: 'Sends the parameter as an array using bracket syntax: param[]=original&param[]=inject.',
    backendBehavior: 'PHP and Rails parse this into an array. A backend that expects a scalar may expose the first or last element, or the raw array string.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const orig = encodeParam(params[targetParam] ?? '')
      const key = encodeURIComponent(targetParam + '[]')
      return `${prefix}${sep}${key}=${orig}&${key}=${encodeParam(injectValue)}`
    },
  },
  {
    id: 'comma-separated',
    name: 'Comma-separated values',
    description: 'Combines both values into a single parameter separated by a comma.',
    backendBehavior: 'Some frameworks (e.g. OpenAPI parsers, CSV-style query params) split on comma. Exposes mismatched parsing assumptions.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const combined = encodeParam(`${params[targetParam] ?? ''},${injectValue}`)
      return `${prefix}${sep}${encodeURIComponent(targetParam)}=${combined}`
    },
  },
  {
    id: 'semicolon-separated',
    name: 'Semicolon-separated values',
    description: 'Combines values using a semicolon delimiter within a single parameter.',
    backendBehavior: 'Legacy Java/JSP apps and some URL routing layers treat semicolons as parameter delimiters. May split unexpectedly.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const combined = encodeParam(`${params[targetParam] ?? ''};${injectValue}`)
      return `${prefix}${sep}${encodeURIComponent(targetParam)}=${combined}`
    },
  },
  {
    id: 'encoded-ampersand',
    name: 'Encoded ampersand injection',
    description: 'Embeds a URL-encoded & inside the parameter value to smuggle a second key=value pair.',
    backendBehavior: 'A backend that double-decodes query strings (e.g. some WAFs, reverse proxies) may parse the injected pair as a separate parameter, bypassing validation on the outer value.',
    buildURL(base, params, targetParam, injectValue) {
      const prefix = buildBase(base, params, targetParam)
      const sep = prefix.includes('?') ? '&' : '?'
      const orig = params[targetParam] ?? ''
      const smuggled = `${orig}%26${encodeURIComponent(targetParam)}=${encodeParam(injectValue)}`
      return `${prefix}${sep}${encodeURIComponent(targetParam)}=${smuggled}`
    },
  },
]
