import { useState, useCallback } from 'react'
import { HPP_STRATEGIES } from '../data/hppStrategies'
import { ExternalLink, Copy, CheckCheck, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react'
import { useBrowsers } from '../hooks/useBrowsers'
import URLParamSelector from '../components/URLParamSelector'

type TestResult = 'untested' | 'detected' | 'not-detected' | 'error'

interface TestCase {
  id: string
  param: string
  strategy: typeof HPP_STRATEGIES[number]
  url: string
  result: TestResult
}

const RESULT_STYLES: Record<TestResult, string> = {
  untested: 'bg-gray-700 text-gray-300',
  detected: 'bg-red-600 text-white',
  'not-detected': 'bg-gray-600 text-gray-300',
  error: 'bg-yellow-700 text-yellow-100',
}

export default function HPPScanner() {
  // URL targets (synced from URLParamSelector via onChange)
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())

  const [injectValue, setInjectValue] = useState('HPP_INJECTED')
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(
    new Set(HPP_STRATEGIES.map(s => s.id))
  )
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { browsers, selected: selectedBrowser, setSelected: setSelectedBrowser, apiAvailable, openInBrowser } = useBrowsers()

  const handleURLChange = useCallback((base: string, params: Record<string, string>, selected: Set<string>) => {
    setParsedBase(base)
    setParsedParams(params)
    setSelectedParams(selected)
    setTestCases([])
  }, [])

  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const generateTestCases = () => {
    if (!parsedBase || selectedParams.size === 0 || selectedStrategies.size === 0 || !injectValue.trim()) return

    const cases: TestCase[] = []
    const activeStrategies = HPP_STRATEGIES.filter(s => selectedStrategies.has(s.id))

    selectedParams.forEach(param => {
      activeStrategies.forEach(strategy => {
        cases.push({
          id: `${param}-${strategy.id}`,
          param,
          strategy,
          url: strategy.buildURL(parsedBase, parsedParams, param, injectValue.trim()),
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

  const detectedCount = testCases.filter(tc => tc.result === 'detected').length
  const testedCount = testCases.filter(tc => tc.result !== 'untested').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">HTTP Parameter Pollution</h1>
        <p className="text-sm text-gray-400 mt-1">
          Tests how your application handles duplicate query parameters. Different backend frameworks resolve conflicts differently — some use the first value, some the last, some concatenate. A mismatch between your app and an upstream proxy or WAF can be exploited.
        </p>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-blue-300">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>
          Set the inject value to something recognisable (e.g. <code className="font-mono text-blue-200">HPP_INJECTED</code>), open each test URL, and check which value your application actually uses or reflects. If it uses the injected value, that parameter is vulnerable to pollution.
        </span>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 flex gap-3 text-sm text-amber-300">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <span>Only test applications you own or have explicit written permission to test.</span>
      </div>

      {/* Step 1: Target URL + params */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">1 — Target URL</h2>
        <URLParamSelector
          onChange={handleURLChange}
          browsers={browsers}
          selectedBrowser={selectedBrowser}
          onBrowserChange={setSelectedBrowser}
          apiAvailable={apiAvailable}
        />
      </section>

      {/* Step 2: Inject value + strategies */}
      {parsedBase && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">2 — Inject Value & Strategies</h2>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Injected value</label>
            <input
              type="text"
              value={injectValue}
              onChange={e => setInjectValue(e.target.value)}
              placeholder="HPP_INJECTED"
              className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-500">Use a unique string so you can spot it in your app's response or logs.</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400">Pollution strategies</p>
            <div className="space-y-2">
              {HPP_STRATEGIES.map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => toggleStrategy(strategy.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    selectedStrategies.has(strategy.id)
                      ? 'bg-violet-900/30 border-violet-700 text-violet-200'
                      : 'bg-gray-800 border-gray-700 text-gray-500'
                  }`}
                >
                  <div className="font-medium">{strategy.name}</div>
                  <div className="text-xs mt-0.5 opacity-70">{strategy.description}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {selectedStrategies.size} strategies · {selectedParams.size} parameter{selectedParams.size !== 1 ? 's' : ''}
            · {selectedStrategies.size * selectedParams.size} test cases will be generated
          </p>

          <button
            onClick={generateTestCases}
            disabled={selectedParams.size === 0 || selectedStrategies.size === 0 || !injectValue.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Generate Test Cases
          </button>
        </section>
      )}

      {/* Step 3: Test cases */}
      {testCases.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">3 — Test Cases</h2>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{testedCount}/{testCases.length} tested</span>
              {detectedCount > 0 && (
                <span className="text-red-400 font-semibold">{detectedCount} detected!</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {testCases.map(tc => (
              <div key={tc.id} className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-850 hover:bg-gray-800 transition-colors">
                  <span className="text-xs font-mono text-gray-400 shrink-0">
                    param: <span className="text-emerald-400">{tc.param}</span>
                  </span>
                  <span className="text-xs text-violet-300 flex-1 truncate">{tc.strategy.name}</span>

                  <div className="flex items-center gap-1 shrink-0">
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
                    <option value="detected">Detected!</option>
                    <option value="not-detected">Not detected</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                {expandedId === tc.id && (
                  <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Strategy</span>
                      <span className="text-xs text-gray-300">{tc.strategy.description}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-xs text-gray-500 w-28 shrink-0">Backend behavior</span>
                      <span className="text-xs text-gray-400">{tc.strategy.backendBehavior}</span>
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
