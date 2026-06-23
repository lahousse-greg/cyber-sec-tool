import { useState, useCallback } from 'react'
import { parseURL, buildTestURL } from '../utils/urlParser'
import { XSS_PAYLOADS, CATEGORY_LABELS, CATEGORY_COLORS, type PayloadCategory, type XSSPayload } from '../data/xssPayloads'
import { ExternalLink, Copy, CheckCheck, ChevronDown, ChevronUp, Plus, Trash2, AlertTriangle, Link2, FormInput } from 'lucide-react'

type TestResult = 'untested' | 'fired' | 'not-fired' | 'error'

interface URLTestCase {
  kind: 'url'
  id: string
  param: string
  payload: XSSPayload
  url: string
  result: TestResult
}

interface FieldTestCase {
  kind: 'field'
  id: string
  fieldName: string
  payload: XSSPayload
  result: TestResult
}

type TestCase = URLTestCase | FieldTestCase

interface TargetField {
  id: string
  name: string
}

const RESULT_STYLES: Record<TestResult, string> = {
  untested: 'bg-gray-700 text-gray-300',
  fired: 'bg-red-600 text-white',
  'not-fired': 'bg-gray-600 text-gray-300',
  error: 'bg-yellow-700 text-yellow-100',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PayloadCategory[]

const FIELD_SUGGESTIONS = ['Search', 'Comment', 'Name', 'Username', 'Email', 'Bio', 'Message']

let fieldCounter = 0
const newField = (name = ''): TargetField => ({ id: `field-${++fieldCounter}`, name })

export default function XSSScanner() {
  // URL targets
  const [rawURL, setRawURL] = useState('')
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [urlError, setURLError] = useState('')
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())
  const [customParam, setCustomParam] = useState('')

  // Field targets
  const [fields, setFields] = useState<TargetField[]>([newField()])

  // Shared
  const [selectedCategories, setSelectedCategories] = useState<Set<PayloadCategory>>(new Set(ALL_CATEGORIES))
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // URL actions
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

  const addCustomParam = () => {
    const trimmed = customParam.trim()
    if (!trimmed || trimmed in parsedParams) return
    setParsedParams(prev => ({ ...prev, [trimmed]: '' }))
    setSelectedParams(prev => new Set([...prev, trimmed]))
    setCustomParam('')
  }

  const removeParam = (param: string) => {
    setParsedParams(prev => { const next = { ...prev }; delete next[param]; return next })
    setSelectedParams(prev => { const next = new Set(prev); next.delete(param); return next })
  }

  // Field actions
  const updateField = (id: string, name: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }

  const addField = () => setFields(prev => [...prev, newField()])

  const removeField = (id: string) => {
    setFields(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev)
  }

  const addSuggestion = (name: string) => {
    if (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) return
    const blank = fields.find(f => f.name.trim() === '')
    if (blank) updateField(blank.id, name)
    else setFields(prev => [...prev, newField(name)])
  }

  // Shared actions
  const toggleCategory = (cat: PayloadCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const generateTestCases = () => {
    const hasURLParams = parsedBase && selectedParams.size > 0
    const activeFields = fields.filter(f => f.name.trim() !== '')
    if ((!hasURLParams && activeFields.length === 0) || selectedCategories.size === 0) return

    const filteredPayloads = XSS_PAYLOADS.filter(p => selectedCategories.has(p.category))
    const cases: TestCase[] = []

    if (hasURLParams) {
      selectedParams.forEach(param => {
        filteredPayloads.forEach(payload => {
          cases.push({
            kind: 'url',
            id: `url-${param}-${payload.id}`,
            param,
            payload,
            url: buildTestURL(parsedBase, parsedParams, param, payload.payload),
            result: 'untested',
          })
        })
      })
    }

    activeFields.forEach(field => {
      filteredPayloads.forEach(payload => {
        cases.push({
          kind: 'field',
          id: `field-${field.id}-${payload.id}`,
          fieldName: field.name,
          payload,
          result: 'untested',
        })
      })
    })

    setTestCases(cases)
    setExpandedId(null)
  }

  const setResult = (id: string, result: TestResult) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, result } : tc))
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const activeFields = fields.filter(f => f.name.trim() !== '')
  const filteredPayloadCount = XSS_PAYLOADS.filter(p => selectedCategories.has(p.category)).length
  const urlCaseCount = parsedBase ? selectedParams.size * filteredPayloadCount : 0
  const fieldCaseCount = activeFields.length * filteredPayloadCount
  const totalCaseCount = urlCaseCount + fieldCaseCount

  const firedCount = testCases.filter(tc => tc.result === 'fired').length
  const testedCount = testCases.filter(tc => tc.result !== 'untested').length
  const canGenerate = (selectedParams.size > 0 || activeFields.length > 0) && selectedCategories.size > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">XSS Scanner</h1>
        <p className="text-sm text-gray-400 mt-1">
          Test URL parameters and input fields for cross-site scripting. URL-based tests open in a new tab; input field tests generate payloads to paste manually.
        </p>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>Only test applications you own or have explicit written permission to test.</span>
      </div>

      {/* Step 1: URL parameters */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Link2 size={15} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">1 — URL Parameters</h2>
          <span className="text-xs text-gray-600 ml-1">optional</span>
        </div>

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

        {parsedBase && (
          <div className="space-y-3 pt-1">
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
                  <button onClick={() => removeParam(key)} className="text-gray-600 hover:text-red-400 transition-colors" title="Remove">
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
          </div>
        )}
      </section>

      {/* Step 2: Input fields */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FormInput size={15} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Input Fields</h2>
          <span className="text-xs text-gray-600 ml-1">optional</span>
        </div>
        <p className="text-xs text-gray-500">Name the form fields you want to test for stored or DOM-based XSS.</p>

        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-5 shrink-0 text-right">{i + 1}.</span>
              <input
                type="text"
                value={field.name}
                onChange={e => updateField(field.id, e.target.value)}
                placeholder="Field name…"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => removeField(field.id)}
                disabled={fields.length === 1}
                className="p-2 text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Remove field"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addField} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors">
          <Plus size={13} /> Add field
        </button>

        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {FIELD_SUGGESTIONS.map(s => {
              const used = fields.some(f => f.name.toLowerCase() === s.toLowerCase())
              return (
                <button
                  key={s}
                  onClick={() => addSuggestion(s)}
                  disabled={used}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    used
                      ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-default'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-emerald-600 hover:text-emerald-400'
                  }`}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Step 3: Payload categories */}
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
              <span className="ml-1.5 opacity-60">({XSS_PAYLOADS.filter(p => p.category === cat).length})</span>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          {filteredPayloadCount} payload{filteredPayloadCount !== 1 ? 's' : ''} selected
          {urlCaseCount > 0 && ` · ${urlCaseCount} URL test${urlCaseCount !== 1 ? 's' : ''}`}
          {fieldCaseCount > 0 && ` · ${fieldCaseCount} field test${fieldCaseCount !== 1 ? 's' : ''}`}
          {totalCaseCount > 0 && ` · ${totalCaseCount} total`}
        </p>

        <button
          onClick={generateTestCases}
          disabled={!canGenerate}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          Generate Test Cases
        </button>
      </section>

      {/* Step 4: Results */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">4 — Test Cases</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{testedCount}/{testCases.length} tested</span>
              {firedCount > 0 && <span className="text-red-400 font-semibold">{firedCount} fired!</span>}
            </div>
          </div>

          <div className="space-y-2">
            {testCases.map(tc => (
              <div key={tc.id} className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-850 hover:bg-gray-800 transition-colors">
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[tc.payload.category]}`}>
                    {tc.payload.category}
                  </span>

                  {tc.kind === 'url' ? (
                    <span className="text-xs font-mono text-gray-400 shrink-0">
                      param: <span className="text-emerald-400">{tc.param}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-gray-400 shrink-0">
                      field: <span className="text-sky-400">{tc.fieldName}</span>
                    </span>
                  )}

                  <span className="text-xs text-gray-300 flex-1 truncate">{tc.payload.name}</span>

                  <div className="flex items-center gap-1 shrink-0">
                    {tc.kind === 'url' ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => copyToClipboard(tc.payload.payload, tc.id + '-payload')}
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                        title="Copy payload"
                      >
                        {copiedId === tc.id + '-payload' ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    )}
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
                    <option value="fired">Fired!</option>
                    <option value="not-fired">Not fired</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {expandedId === tc.id && (
                  <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                    <div className="flex gap-2 items-start">
                      <span className="text-xs text-gray-500 w-24 shrink-0">Payload</span>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <code className="text-xs font-mono text-yellow-300 break-all">{tc.payload.payload}</code>
                        <button
                          onClick={() => copyToClipboard(tc.payload.payload, tc.id + '-payload-exp')}
                          className="shrink-0 text-gray-500 hover:text-gray-200"
                        >
                          {copiedId === tc.id + '-payload-exp' ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-24 shrink-0">Context</span>
                      <span className="text-xs text-gray-400 font-mono">{tc.payload.context}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-24 shrink-0">How it works</span>
                      <span className="text-xs text-gray-400">{tc.payload.description}</span>
                    </div>
                    {tc.kind === 'url' ? (
                      <div className="flex gap-2 items-start">
                        <span className="text-xs text-gray-500 w-24 shrink-0">Test URL</span>
                        <code className="text-xs font-mono text-blue-300 break-all">{tc.url}</code>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-500 w-24 shrink-0">Instructions</span>
                        <span className="text-xs text-gray-300">
                          Paste this payload into the <span className="text-sky-400 font-medium">{tc.fieldName}</span> field, submit the form, and check if the payload executes.
                        </span>
                      </div>
                    )}
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
