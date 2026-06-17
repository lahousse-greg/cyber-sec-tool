import { useState, useCallback } from 'react'
import { parseURL, buildTestURL } from '../utils/urlParser'
import { XSS_PAYLOADS, CATEGORY_LABELS, CATEGORY_COLORS, type PayloadCategory, type XSSPayload } from '../data/xssPayloads'
import { ExternalLink, Copy, CheckCheck, ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle } from 'lucide-react'

type TestResult = 'untested' | 'fired' | 'not-fired' | 'error'

interface TestCase {
  id: string
  param: string
  payload: XSSPayload
  url: string
  result: TestResult
}

const RESULT_STYLES: Record<TestResult, string> = {
  untested: 'bg-gray-700 text-gray-300',
  fired: 'bg-red-600 text-white',
  'not-fired': 'bg-gray-600 text-gray-300',
  error: 'bg-yellow-700 text-yellow-100',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PayloadCategory[]

export default function XSSScanner() {
  const [rawURL, setRawURL] = useState('')
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [urlError, setURLError] = useState('')
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())
  const [selectedCategories, setSelectedCategories] = useState<Set<PayloadCategory>>(new Set(ALL_CATEGORIES))
  const [customParam, setCustomParam] = useState('')
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

  const toggleCategory = (cat: PayloadCategory) => {
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

    const filteredPayloads = XSS_PAYLOADS.filter(p => selectedCategories.has(p.category))
    const cases: TestCase[] = []

    selectedParams.forEach(param => {
      filteredPayloads.forEach(payload => {
        cases.push({
          id: `${param}-${payload.id}`,
          param,
          payload,
          url: buildTestURL(parsedBase, parsedParams, param, payload.payload),
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

  const firedCount = testCases.filter(tc => tc.result === 'fired').length
  const testedCount = testCases.filter(tc => tc.result !== 'untested').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">XSS Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">
          Enter a target URL, select parameters and payload categories, then open each generated test URL in your browser to check if the payload executes.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>Only test applications you own or have explicit written permission to test. This tool generates XSS test URLs — you are responsible for where you send them.</span>
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
            placeholder="https://staging.example.com/search?q=test&page=1"
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
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Select Parameters to Fuzz</h2>

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

      {/* Step 3: Payload categories */}
      {parsedBase && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">3 — Payload Categories</h2>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  selectedCategories.has(cat)
                    ? CATEGORY_COLORS[cat]
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {CATEGORY_LABELS[cat]}
                <span className="ml-1.5 opacity-60">
                  ({XSS_PAYLOADS.filter(p => p.category === cat).length})
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {XSS_PAYLOADS.filter(p => selectedCategories.has(p.category)).length} payloads selected
            · {selectedParams.size} parameter{selectedParams.size !== 1 ? 's' : ''} selected
            · {XSS_PAYLOADS.filter(p => selectedCategories.has(p.category)).length * selectedParams.size} test cases will be generated
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

      {/* Results */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">4 — Test Cases</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{testedCount}/{testCases.length} tested</span>
              {firedCount > 0 && (
                <span className="text-red-400 font-semibold">{firedCount} fired!</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {testCases.map(tc => (
              <div key={tc.id} className="border border-gray-800 rounded-lg overflow-hidden">
                {/* Row */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-850 hover:bg-gray-800 transition-colors">
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[tc.payload.category]}`}>
                    {tc.payload.category}
                  </span>
                  <span className="text-xs font-mono text-gray-400 shrink-0">
                    param: <span className="text-emerald-400">{tc.param}</span>
                  </span>
                  <span className="text-xs font-mono text-gray-300 flex-1 truncate">{tc.payload.name}</span>

                  {/* Action buttons */}
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
                      title="Show details"
                    >
                      {expandedId === tc.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Result selector */}
                  <select
                    value={tc.result}
                    onChange={e => setResult(tc.id, e.target.value as TestResult)}
                    className={`shrink-0 text-xs px-2 py-1 rounded border-0 font-medium cursor-pointer ${RESULT_STYLES[tc.result]}`}
                  >
                    <option value="untested">Untested</option>
                    <option value="fired">Fired!</option>
                    <option value="not-fired">Not fired</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {/* Expanded detail */}
                {expandedId === tc.id && (
                  <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                    <div className="flex gap-2 items-start">
                      <span className="text-xs text-gray-500 w-20 shrink-0">Payload</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-xs font-mono text-yellow-300 break-all">{tc.payload.payload}</code>
                        <button
                          onClick={() => copyToClipboard(tc.payload.payload, tc.id + '-payload')}
                          className="shrink-0 text-gray-500 hover:text-gray-200"
                        >
                          {copiedId === tc.id + '-payload' ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-20 shrink-0">Context</span>
                      <span className="text-xs text-gray-400 font-mono">{tc.payload.context}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-20 shrink-0">How it works</span>
                      <span className="text-xs text-gray-400">{tc.payload.description}</span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="text-xs text-gray-500 w-20 shrink-0">Test URL</span>
                      <code className="text-xs font-mono text-blue-300 break-all">{tc.url}</code>
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
