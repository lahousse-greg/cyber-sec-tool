import { useState, useCallback } from 'react'
import { parseURL } from '../utils/urlParser'
import {
  SQLI_PAYLOADS,
  SQLI_CATEGORY_LABELS,
  SQLI_CATEGORY_COLORS,
  type SQLiCategory,
} from '../data/sqliPayloads'
import { ExternalLink, Copy, CheckCheck, ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle, Info } from 'lucide-react'

type TestResult = 'untested' | 'vulnerable' | 'not-vulnerable' | 'error'

interface TestCase {
  id: string
  param: string
  payload: typeof SQLI_PAYLOADS[number]
  url: string
  result: TestResult
}

const RESULT_STYLES: Record<TestResult, string> = {
  untested: 'bg-gray-700 text-gray-300',
  vulnerable: 'bg-red-600 text-white',
  'not-vulnerable': 'bg-gray-600 text-gray-300',
  error: 'bg-yellow-700 text-yellow-100',
}

const ALL_CATEGORIES: SQLiCategory[] = [
  'error-based',
  'boolean-based',
  'time-based',
  'union-based',
  'comment-injection',
  'stacked-queries',
]

export default function SQLiScanner() {
  const [rawURL, setRawURL] = useState('')
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [urlError, setURLError] = useState('')
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())
  const [customParam, setCustomParam] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<SQLiCategory>>(
    new Set(ALL_CATEGORIES)
  )
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleParseURL = useCallback(() => {
    const result = parseURL(rawURL)
    if (!result.isValid) {
      setURLError(result.error ?? 'Invalid URL')
      setParsedBase('')
      setParsedParams({})
      setSelectedParams(new Set())
      return
    }
    setURLError('')
    setParsedBase(result.base)
    setParsedParams(result.params)
    setSelectedParams(new Set(Object.keys(result.params)))
    setTestCases([])
  }, [rawURL])

  const toggleParam = (param: string) => {
    setSelectedParams(prev => {
      const next = new Set(prev)
      next.has(param) ? next.delete(param) : next.add(param)
      return next
    })
  }

  const toggleCategory = (cat: SQLiCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const addCustomParam = () => {
    const trimmed = customParam.trim()
    if (!trimmed || trimmed in parsedParams) return
    setParsedParams(prev => ({ ...prev, [trimmed]: '' }))
    setSelectedParams(prev => new Set([...prev, trimmed]))
    setCustomParam('')
  }

  const removeParam = (param: string) => {
    setParsedParams(prev => {
      const next = { ...prev }
      delete next[param]
      return next
    })
    setSelectedParams(prev => {
      const next = new Set(prev)
      next.delete(param)
      return next
    })
  }

  const generateTestCases = () => {
    if (!parsedBase || selectedParams.size === 0 || selectedCategories.size === 0) return

    const activePayloads = SQLI_PAYLOADS.filter(p => selectedCategories.has(p.category))
    const cases: TestCase[] = []

    selectedParams.forEach(param => {
      activePayloads.forEach(payload => {
        const url = new URL(parsedBase)
        Object.entries(parsedParams).forEach(([k, v]) => url.searchParams.set(k, v))
        url.searchParams.set(param, payload.payload)
        cases.push({
          id: `${param}-${payload.id}`,
          param,
          payload,
          url: url.toString(),
          result: 'untested',
        })
      })
    })

    setTestCases(cases)
  }

  const setResult = (id: string, result: TestResult) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, result } : tc))
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const activePayloadCount = SQLI_PAYLOADS.filter(p => selectedCategories.has(p.category)).length
  const vulnerableCount = testCases.filter(tc => tc.result === 'vulnerable').length
  const testedCount = testCases.filter(tc => tc.result !== 'untested').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">SQL Injection Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">
          Generates test URLs with SQL injection payloads injected into query parameters. Open each URL in your app and observe whether the response leaks an error, behaves differently, or reflects data — each indicates a potential injection point.
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-blue-300">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Because this tool is client-side, it can't read your app's responses. Open each test URL in a browser tab and look for the signal described in each test case — error messages, changed content, or timing delays.
        </span>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>Only test applications you own or have explicit written permission to test. Time-based payloads will cause real delays on your server.</span>
      </div>

      {/* Step 1: URL */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">1 — Target URL</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={rawURL}
            onChange={e => setRawURL(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleParseURL()}
            placeholder="https://staging.example.com/products?id=42&category=shoes"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleParseURL}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Parse
          </button>
        </div>
        {urlError && <p className="text-red-400 text-xs">{urlError}</p>}
        {parsedBase && (
          <p className="text-xs text-gray-500">
            Base: <span className="text-gray-300 font-mono">{parsedBase}</span>
          </p>
        )}
      </section>

      {/* Step 2: Parameters */}
      {parsedBase && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Select Parameters to Test</h2>

          {Object.keys(parsedParams).length === 0 && (
            <p className="text-sm text-gray-500">No query parameters detected. Add one manually below.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {Object.entries(parsedParams).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1">
                <button
                  onClick={() => toggleParam(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                    selectedParams.has(key)
                      ? 'bg-emerald-700/30 border-emerald-600 text-emerald-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  <span className="font-semibold">{key}</span>
                  {val && <span className="text-gray-500">= {val.length > 12 ? val.slice(0, 12) + '…' : val}</span>}
                </button>
                <button
                  onClick={() => removeParam(key)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                  title="Remove parameter"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customParam}
              onChange={e => setCustomParam(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomParam()}
              placeholder="Add custom parameter name…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={addCustomParam}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>
      )}

      {/* Step 3: Categories */}
      {parsedBase && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">3 — Payload Categories</h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALL_CATEGORIES.map(cat => {
              const count = SQLI_PAYLOADS.filter(p => p.category === cat).length
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    selectedCategories.has(cat)
                      ? 'bg-gray-800 border-gray-600 text-gray-200'
                      : 'bg-gray-850 border-gray-800 text-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SQLI_CATEGORY_COLORS[cat]}`}>
                      {SQLI_CATEGORY_LABELS[cat]}
                    </span>
                    <span className={`text-xs ${selectedCategories.has(cat) ? 'text-gray-400' : 'text-gray-700'}`}>
                      {count}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-gray-500">
            {selectedCategories.size} categories · {activePayloadCount} payloads · {selectedParams.size} parameter{selectedParams.size !== 1 ? 's' : ''}
            · {activePayloadCount * selectedParams.size} test cases will be generated
          </p>

          <button
            onClick={generateTestCases}
            disabled={selectedParams.size === 0 || selectedCategories.size === 0}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generate Test Cases
          </button>
        </section>
      )}

      {/* Step 4: Results */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">4 — Test Cases</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{testedCount}/{testCases.length} tested</span>
              {vulnerableCount > 0 && (
                <span className="text-red-400 font-semibold">{vulnerableCount} vulnerable!</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {testCases.map(tc => (
              <div key={tc.id} className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-850 hover:bg-gray-800 transition-colors">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${SQLI_CATEGORY_COLORS[tc.payload.category]}`}>
                    {SQLI_CATEGORY_LABELS[tc.payload.category]}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 shrink-0">{tc.param}</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{tc.payload.name}</span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(tc.url, tc.id + '-url')}
                      className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                      title="Copy test URL"
                    >
                      {copiedId === tc.id + '-url' ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={tc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                    >
                      {expandedId === tc.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  <select
                    value={tc.result}
                    onChange={e => setResult(tc.id, e.target.value as TestResult)}
                    className={`shrink-0 text-xs px-2 py-1 rounded border-0 font-medium cursor-pointer ${RESULT_STYLES[tc.result]}`}
                  >
                    <option value="untested">Untested</option>
                    <option value="vulnerable">Vulnerable!</option>
                    <option value="not-vulnerable">Not vulnerable</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {expandedId === tc.id && (
                  <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Payload</span>
                      <code className="text-xs font-mono text-orange-300 break-all">{tc.payload.payload}</code>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Description</span>
                      <span className="text-xs text-gray-300">{tc.payload.description}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">What to observe</span>
                      <span className="text-xs text-gray-400">{tc.payload.observe}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Test URL</span>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <code className="text-xs font-mono text-blue-300 break-all">{tc.url}</code>
                        <button
                          onClick={() => copyToClipboard(tc.url, tc.id + '-url-exp')}
                          className="shrink-0 text-gray-500 hover:text-gray-200"
                        >
                          {copiedId === tc.id + '-url-exp' ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
