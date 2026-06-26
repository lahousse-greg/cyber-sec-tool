import { useState, useCallback } from 'react'
import { buildTestURL } from '../utils/urlParser'
import { XSS_PAYLOADS, CATEGORY_LABELS, CATEGORY_COLORS, type PayloadCategory, type XSSPayload } from '../data/xssPayloads'
import { ExternalLink, Copy, CheckCheck, ChevronDown, ChevronUp, AlertTriangle, Link2, FormInput, Play, Loader2 } from 'lucide-react'
import { useBrowsers } from '../hooks/useBrowsers'
import URLParamSelector from '../components/URLParamSelector'
import FieldSelector, { type TargetField } from '../components/FieldSelector'

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
  automationTarget?: { url: string; selector: string }
}

type TestCase = URLTestCase | FieldTestCase

const RESULT_STYLES: Record<TestResult, string> = {
  untested: 'bg-gray-700 text-gray-300',
  fired: 'bg-red-600 text-white',
  'not-fired': 'bg-gray-600 text-gray-300',
  error: 'bg-yellow-700 text-yellow-100',
}

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PayloadCategory[]

const FIELD_SUGGESTIONS = ['Search', 'Comment', 'Name', 'Username', 'Email', 'Bio', 'Message']

export default function XSSScanner() {
  // URL targets (synced from URLParamSelector)
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())

  // Field targets (synced from FieldSelector)
  const [activeFields, setActiveFields] = useState<TargetField[]>([])

  // Mode
  const [activeMode, setActiveMode] = useState<'url' | 'field' | null>('url')
  const urlEnabled = activeMode === 'url'
  const fieldsEnabled = activeMode === 'field'

  // Shared
  const [selectedCategories, setSelectedCategories] = useState<Set<PayloadCategory>>(new Set(ALL_CATEGORIES))
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [injectingId, setInjectingId] = useState<string | null>(null)
  const [injectedIds, setInjectedIds] = useState<Set<string>>(new Set())

  const { browsers, selected: selectedBrowser, setSelected: setSelectedBrowser, apiAvailable, openInBrowser } = useBrowsers()

  const injectPayload = async (tc: FieldTestCase) => {
    if (!tc.automationTarget) return
    setInjectingId(tc.id)
    try {
      const res = await fetch('/api/inject-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tc.automationTarget.url, selector: tc.automationTarget.selector, payload: tc.payload.payload }),
      })
      const data = await res.json() as { ok: boolean }
      if (data.ok) setInjectedIds(prev => new Set(prev).add(tc.id))
    } finally {
      setInjectingId(null)
    }
  }

  const handleURLChange = useCallback((base: string, params: Record<string, string>, selected: Set<string>) => {
    setParsedBase(base)
    setParsedParams(params)
    setSelectedParams(selected)
    setTestCases([])
  }, [])

  const toggleCategory = (cat: PayloadCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const generateTestCases = () => {
    const hasURLParams = urlEnabled && parsedBase && selectedParams.size > 0
    const fieldsToTest = fieldsEnabled ? activeFields : []
    if ((!hasURLParams && fieldsToTest.length === 0) || selectedCategories.size === 0) return

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

    fieldsToTest.forEach(field => {
      filteredPayloads.forEach(payload => {
        cases.push({
          kind: 'field',
          id: `field-${field.id}-${payload.id}`,
          fieldName: field.name,
          payload,
          result: 'untested',
          automationTarget: field.automationTarget,
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

  const filteredPayloadCount = XSS_PAYLOADS.filter(p => selectedCategories.has(p.category)).length
  const urlCaseCount = urlEnabled && parsedBase ? selectedParams.size * filteredPayloadCount : 0
  const fieldCaseCount = fieldsEnabled ? activeFields.length * filteredPayloadCount : 0
  const totalCaseCount = urlCaseCount + fieldCaseCount

  const firedCount = testCases.filter(tc => tc.result === 'fired').length
  const testedCount = testCases.filter(tc => tc.result !== 'untested').length
  const canGenerate = (urlCaseCount > 0 || fieldCaseCount > 0) && selectedCategories.size > 0

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

      {/* Step 1: Test targets */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">1 — Test Targets</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveMode(activeMode === 'url' ? null : 'url')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              urlEnabled
                ? 'bg-emerald-700/30 border-emerald-600 text-emerald-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Link2 size={14} />
            URL <span className="text-xs font-normal opacity-70">(Reflected XSS)</span>
          </button>
          <button
            onClick={() => setActiveMode(activeMode === 'field' ? null : 'field')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              fieldsEnabled
                ? 'bg-sky-700/30 border-sky-600 text-sky-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            <FormInput size={14} />
            Input <span className="text-xs font-normal opacity-70">(Stored XSS)</span>
          </button>
        </div>

        {urlEnabled && (
          <div className="border-t border-gray-800 pt-4">
            <URLParamSelector
              onChange={handleURLChange}
              browsers={browsers}
              selectedBrowser={selectedBrowser}
              onBrowserChange={setSelectedBrowser}
              apiAvailable={apiAvailable}
            />
          </div>
        )}

        {/* FieldSelector stays mounted to preserve field state between mode switches */}
        <div className={fieldsEnabled ? 'border-t border-gray-800 pt-4' : 'hidden'}>
          <FieldSelector
            suggestions={FIELD_SUGGESTIONS}
            description="Name the form fields you want to test for stored or DOM-based XSS."
            onChange={setActiveFields}
            apiAvailable={apiAvailable}
          />
        </div>
      </section>

      {/* Step 2: Payload categories */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Payload Categories</h2>
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

      {/* Step 3: Results */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">3 — Test Cases</h2>
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
                        <button
                          onClick={() => openInBrowser(tc.url)}
                          className="p-1.5 text-gray-500 hover:text-emerald-400 transition-colors"
                          title="Open in browser"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => copyToClipboard(tc.payload.payload, tc.id + '-payload')}
                          className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                          title="Copy payload"
                        >
                          {copiedId === tc.id + '-payload' ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                        {tc.automationTarget && (
                          <button
                            onClick={() => injectPayload(tc)}
                            disabled={injectingId === tc.id}
                            className="p-1.5 text-gray-500 hover:text-sky-400 disabled:opacity-50 transition-colors"
                            title="Inject payload into field"
                          >
                            {injectingId === tc.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : injectedIds.has(tc.id)
                                ? <CheckCheck size={14} className="text-sky-400" />
                                : <Play size={14} />
                            }
                          </button>
                        )}
                      </>
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
