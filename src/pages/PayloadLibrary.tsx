import { useState } from 'react'
import { XSS_PAYLOADS, CATEGORY_LABELS, CATEGORY_COLORS, type PayloadCategory } from '../data/xssPayloads'
import { SQLI_PAYLOADS, SQLI_CATEGORY_LABELS, SQLI_CATEGORY_COLORS, type SQLiCategory } from '../data/sqliPayloads'
import { HPP_STRATEGIES } from '../data/hppStrategies'
import { Copy, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'

type LibraryTab = 'xss' | 'sqli' | 'hpp'

const HPP_EXAMPLES: Record<string, string> = {
  'append': '?param=original&param=INJECT',
  'prepend': '?param=INJECT&param=original',
  'array-bracket': '?param[]=original&param[]=INJECT',
  'comma-separated': '?param=original,INJECT',
  'semicolon-separated': '?param=original;INJECT',
  'encoded-ampersand': '?param=original%26param=INJECT',
}

const XSS_CATS = Object.keys(CATEGORY_LABELS) as PayloadCategory[]
const SQLI_CATS = Object.keys(SQLI_CATEGORY_LABELS) as SQLiCategory[]

export default function PayloadLibrary() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('xss')
  const [xssCats, setXssCats] = useState<Set<PayloadCategory>>(new Set(XSS_CATS))
  const [sqliCats, setSqliCats] = useState<Set<SQLiCategory>>(new Set(SQLI_CATS))
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleTabChange = (tab: LibraryTab) => {
    setActiveTab(tab)
    setSearch('')
    setExpandedId(null)
  }

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filteredXSS = XSS_PAYLOADS.filter(p => {
    if (!xssCats.has(p.category)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.payload.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })

  const filteredSQLi = SQLI_PAYLOADS.filter(p => {
    if (!sqliCats.has(p.category)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.payload.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
  })

  const filteredHPP = HPP_STRATEGIES.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.backendBehavior.toLowerCase().includes(q)
  })

  const tabClass = (tab: LibraryTab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-emerald-500 text-emerald-400'
        : 'border-transparent text-gray-500 hover:text-gray-300'
    }`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Payload Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          Reference library for all payloads and strategies. Copy individual entries directly into your test runner.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800 flex gap-1">
        <button onClick={() => handleTabChange('xss')} className={tabClass('xss')}>
          XSS <span className="ml-1 text-xs opacity-60">({XSS_PAYLOADS.length})</span>
        </button>
        <button onClick={() => handleTabChange('sqli')} className={tabClass('sqli')}>
          SQLi <span className="ml-1 text-xs opacity-60">({SQLI_PAYLOADS.length})</span>
        </button>
        <button onClick={() => handleTabChange('hpp')} className={tabClass('hpp')}>
          HPP <span className="ml-1 text-xs opacity-60">({HPP_STRATEGIES.length})</span>
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search payloads…"
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
      />

      {/* XSS Tab */}
      {activeTab === 'xss' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {XSS_CATS.map(cat => (
              <button
                key={cat}
                onClick={() => setXssCats(prev => {
                  const next = new Set(prev)
                  next.has(cat) ? next.delete(cat) : next.add(cat)
                  return next
                })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  xssCats.has(cat) ? CATEGORY_COLORS[cat] : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {CATEGORY_LABELS[cat]}
                <span className="ml-1.5 opacity-60">({XSS_PAYLOADS.filter(p => p.category === cat).length})</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-500 self-center">{filteredXSS.length} payloads</span>
          </div>

          {XSS_CATS.filter(cat => xssCats.has(cat)).map(cat => {
            const payloads = filteredXSS.filter(p => p.category === cat)
            if (payloads.length === 0) return null
            return (
              <div key={cat} className="space-y-2">
                <h2 className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${CATEGORY_COLORS[cat]}`}>
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="space-y-1">
                  {payloads.map(p => (
                    <div key={p.id} className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-900 hover:bg-gray-800 transition-colors">
                        <span className="flex-1 text-sm text-gray-200">{p.name}</span>
                        <code className="hidden sm:block flex-1 text-xs font-mono text-yellow-300 truncate max-w-xs">{p.payload}</code>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => copyText(p.payload, p.id)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors" title="Copy payload">
                            {copiedId === p.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors">
                            {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                      {expandedId === p.id && (
                        <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-gray-500 w-24 shrink-0">Payload</span>
                            <code className="text-xs font-mono text-yellow-300 break-all">{p.payload}</code>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-gray-500 w-24 shrink-0">Context</span>
                            <span className="text-xs text-gray-400 font-mono">{p.context}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-gray-500 w-24 shrink-0">Description</span>
                            <span className="text-xs text-gray-400">{p.description}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredXSS.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-12">No payloads match your filters.</p>
          )}
        </div>
      )}

      {/* SQLi Tab */}
      {activeTab === 'sqli' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {SQLI_CATS.map(cat => (
              <button
                key={cat}
                onClick={() => setSqliCats(prev => {
                  const next = new Set(prev)
                  next.has(cat) ? next.delete(cat) : next.add(cat)
                  return next
                })}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  sqliCats.has(cat) ? SQLI_CATEGORY_COLORS[cat] : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {SQLI_CATEGORY_LABELS[cat]}
                <span className="ml-1.5 opacity-60">({SQLI_PAYLOADS.filter(p => p.category === cat).length})</span>
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-500 self-center">{filteredSQLi.length} payloads</span>
          </div>

          {SQLI_CATS.filter(cat => sqliCats.has(cat)).map(cat => {
            const payloads = filteredSQLi.filter(p => p.category === cat)
            if (payloads.length === 0) return null
            return (
              <div key={cat} className="space-y-2">
                <h2 className={`inline-flex px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${SQLI_CATEGORY_COLORS[cat]}`}>
                  {SQLI_CATEGORY_LABELS[cat]}
                </h2>
                <div className="space-y-1">
                  {payloads.map(p => (
                    <div key={p.id} className="border border-gray-800 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-900 hover:bg-gray-800 transition-colors">
                        <span className="flex-1 text-sm text-gray-200">{p.name}</span>
                        <code className="hidden sm:block flex-1 text-xs font-mono text-orange-300 truncate max-w-xs">{p.payload}</code>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => copyText(p.payload, p.id)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors" title="Copy payload">
                            {copiedId === p.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors">
                            {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                      {expandedId === p.id && (
                        <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                          <div className="flex gap-2 items-start">
                            <span className="text-xs text-gray-500 w-28 shrink-0">Payload</span>
                            <code className="text-xs font-mono text-orange-300 break-all">{p.payload}</code>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-gray-500 w-28 shrink-0">Description</span>
                            <span className="text-xs text-gray-400">{p.description}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-xs text-gray-500 w-28 shrink-0">What to observe</span>
                            <span className="text-xs text-gray-400">{p.observe}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredSQLi.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-12">No payloads match your filters.</p>
          )}
        </div>
      )}

      {/* HPP Tab */}
      {activeTab === 'hpp' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-4">{filteredHPP.length} strategies — use the HPP Scanner to generate test URLs against a real target.</p>

          {filteredHPP.map(s => (
            <div key={s.id} className="border border-gray-800 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-900 hover:bg-gray-800 transition-colors">
                <span className="flex-1 text-sm text-gray-200">{s.name}</span>
                <code className="hidden sm:block flex-1 text-xs font-mono text-violet-300 truncate max-w-xs">{HPP_EXAMPLES[s.id]}</code>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyText(HPP_EXAMPLES[s.id] ?? '', s.id)}
                    className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                    title="Copy example pattern"
                  >
                    {copiedId === s.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors">
                    {expandedId === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
              {expandedId === s.id && (
                <div className="px-4 py-3 bg-gray-950 border-t border-gray-800 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-gray-500 w-32 shrink-0">Example pattern</span>
                    <code className="text-xs font-mono text-violet-300 break-all">{HPP_EXAMPLES[s.id]}</code>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500 w-32 shrink-0">Description</span>
                    <span className="text-xs text-gray-400">{s.description}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-500 w-32 shrink-0">Backend behavior</span>
                    <span className="text-xs text-gray-400">{s.backendBehavior}</span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredHPP.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-12">No strategies match your search.</p>
          )}
        </div>
      )}
    </div>
  )
}
