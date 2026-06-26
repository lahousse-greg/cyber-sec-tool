import { useState } from 'react'
import {
  SQLI_PAYLOADS,
  SQLI_CATEGORY_LABELS,
  SQLI_CATEGORY_COLORS,
  type SQLiCategory,
} from '../data/sqliPayloads'
import { Copy, CheckCheck, ChevronDown, ChevronUp, AlertTriangle, Info, Play, Loader2 } from 'lucide-react'
import { useBrowsers } from '../hooks/useBrowsers'
import FieldSelector, { type TargetField } from '../components/FieldSelector'

type TestResult = 'untested' | 'vulnerable' | 'not-vulnerable' | 'error'

interface TestCase {
  id: string
  field: TargetField
  payload: typeof SQLI_PAYLOADS[number]
  result: TestResult
  automationTarget?: { url: string; selector: string }
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

const FIELD_SUGGESTIONS = ['Username', 'Password', 'Search', 'Email', 'Product ID', 'Order ID', 'Comment']

export default function SQLiScanner() {
  const [activeFields, setActiveFields] = useState<TargetField[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<SQLiCategory>>(new Set(ALL_CATEGORIES))
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [injectingId, setInjectingId] = useState<string | null>(null)
  const [injectedIds, setInjectedIds] = useState<Set<string>>(new Set())

  const { apiAvailable } = useBrowsers()

  const toggleCategory = (cat: SQLiCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const generateTestCases = () => {
    if (activeFields.length === 0 || selectedCategories.size === 0) return

    const activePayloads = SQLI_PAYLOADS.filter(p => selectedCategories.has(p.category))
    const cases: TestCase[] = []

    activeFields.forEach(field => {
      activePayloads.forEach(payload => {
        cases.push({
          id: `${field.id}-${payload.id}`,
          field,
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

  const injectPayload = async (tc: TestCase) => {
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

  const copyPayload = async (text: string, id: string) => {
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
          Define the input fields you want to test, select payload categories, and get a checklist of payloads to manually submit through your application's forms.
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-blue-300">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Copy each payload and paste it directly into the target field in your application. Submit the form and observe the response — look for the signal described in each test case.
        </span>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>Only test applications you own or have explicit written permission to test. Time-based payloads will cause real delays on your server.</span>
      </div>

      {/* Step 1: Target fields */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">1 — Target Input Fields</h2>
        <FieldSelector
          suggestions={FIELD_SUGGESTIONS}
          description='Name each field you want to test (e.g. "Username", "Search box", "Order ID").'
          onChange={setActiveFields}
          apiAvailable={apiAvailable}
        />
      </section>

      {/* Step 2: Categories */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Payload Categories</h2>

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
          {selectedCategories.size} categories · {activePayloadCount} payloads · {activeFields.length} field{activeFields.length !== 1 ? 's' : ''}
          · {activePayloadCount * activeFields.length} test cases will be generated
        </p>

        <button
          onClick={generateTestCases}
          disabled={activeFields.length === 0 || selectedCategories.size === 0}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          Generate Test Cases
        </button>
      </section>

      {/* Step 3: Results */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">3 — Test Checklist</h2>
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
                  <span className="text-xs font-medium text-emerald-400 shrink-0">{tc.field.name}</span>
                  <span className="text-xs text-gray-300 flex-1 truncate">{tc.payload.name}</span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyPayload(tc.payload.payload, tc.id + '-payload')}
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
                    <div className="flex gap-2 items-start">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Payload</span>
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <code className="text-xs font-mono text-orange-300 break-all">{tc.payload.payload}</code>
                        <button
                          onClick={() => copyPayload(tc.payload.payload, tc.id + '-payload-exp')}
                          className="shrink-0 text-gray-500 hover:text-gray-200"
                        >
                          {copiedId === tc.id + '-payload-exp' ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Instructions</span>
                      <span className="text-xs text-gray-300">
                        Copy the payload, paste it into the <span className="text-emerald-400 font-medium">{tc.field.name}</span> field, submit the form, and observe the response.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Description</span>
                      <span className="text-xs text-gray-400">{tc.payload.description}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">What to observe</span>
                      <span className="text-xs text-gray-400">{tc.payload.observe}</span>
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
