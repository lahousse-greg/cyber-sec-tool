import { useState } from 'react'
import { XSS_PAYLOADS, CATEGORY_LABELS, CATEGORY_COLORS, type PayloadCategory } from '../data/xssPayloads'
import { Copy, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PayloadCategory[]

export default function PayloadLibrary() {
  const [activeCategories, setActiveCategories] = useState<Set<PayloadCategory>>(new Set(ALL_CATEGORIES))
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleCategory = (cat: PayloadCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const copyPayload = async (payload: string, id: string) => {
    await navigator.clipboard.writeText(payload)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const filtered = XSS_PAYLOADS.filter(p => {
    if (!activeCategories.has(p.category)) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.payload.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Payload Library</h1>
        <p className="text-sm text-gray-400 mt-1">
          {XSS_PAYLOADS.length} XSS payloads across {ALL_CATEGORIES.length} categories. Use these as a reference or copy them directly into your test runner.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search payloads…"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              activeCategories.has(cat)
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
        <span className="ml-auto text-xs text-gray-500 self-center">{filtered.length} payloads</span>
      </div>

      {/* Payload list grouped by category */}
      {ALL_CATEGORIES.filter(cat => activeCategories.has(cat)).map(cat => {
        const payloads = filtered.filter(p => p.category === cat)
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
                    <code className="hidden sm:block flex-1 text-xs font-mono text-yellow-300 truncate max-w-xs">
                      {p.payload}
                    </code>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyPayload(p.payload, p.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                        title="Copy payload"
                      >
                        {copiedId === p.id ? <CheckCheck size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors"
                      >
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

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-12">No payloads match your filters.</p>
      )}
    </div>
  )
}
