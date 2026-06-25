import { useState } from 'react'
import { parseURL } from '../utils/urlParser'
import { Plus, Trash2 } from 'lucide-react'
import type { Browser } from '../hooks/useBrowsers'

interface Props {
  onChange: (base: string, params: Record<string, string>, selected: Set<string>) => void
  browsers: Browser[]
  selectedBrowser: string | null
  onBrowserChange: (id: string) => void
  apiAvailable: boolean
}

export default function URLParamSelector({ onChange, browsers, selectedBrowser, onBrowserChange, apiAvailable }: Props) {
  const [rawURL, setRawURL] = useState('')
  const [parsedBase, setParsedBase] = useState('')
  const [parsedParams, setParsedParams] = useState<Record<string, string>>({})
  const [selectedParams, setSelectedParams] = useState<Set<string>>(new Set())
  const [urlError, setURLError] = useState('')
  const [customParam, setCustomParam] = useState('')

  const handleParseURL = () => {
    const result = parseURL(rawURL)
    if (!result.isValid) {
      setURLError(result.error ?? 'Invalid URL')
      setParsedBase('')
      setParsedParams({})
      const empty = new Set<string>()
      setSelectedParams(empty)
      onChange('', {}, empty)
      return
    }
    setURLError('')
    setParsedBase(result.base)
    setParsedParams(result.params)
    const sel = new Set(Object.keys(result.params))
    setSelectedParams(sel)
    onChange(result.base, result.params, sel)
  }

  const toggleParam = (param: string) => {
    setSelectedParams(prev => {
      const next = new Set(prev)
      next.has(param) ? next.delete(param) : next.add(param)
      onChange(parsedBase, parsedParams, next)
      return next
    })
  }

  const addCustomParam = () => {
    const trimmed = customParam.trim()
    if (!trimmed || trimmed in parsedParams) return
    const newParams = { ...parsedParams, [trimmed]: '' }
    const newSelected = new Set([...selectedParams, trimmed])
    setParsedParams(newParams)
    setSelectedParams(newSelected)
    setCustomParam('')
    onChange(parsedBase, newParams, newSelected)
  }

  const removeParam = (param: string) => {
    const newParams = { ...parsedParams }
    delete newParams[param]
    const newSelected = new Set(selectedParams)
    newSelected.delete(param)
    setParsedParams(newParams)
    setSelectedParams(newSelected)
    onChange(parsedBase, newParams, newSelected)
  }

  return (
    <div className="space-y-3">
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
        <div className="space-y-3">
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
        </div>
      )}

      {apiAvailable && browsers.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-gray-800/60">
          <p className="text-xs text-gray-500">Open tests in</p>
          <div className="flex flex-wrap gap-2">
            {browsers.map(b => (
              <label key={b.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                selectedBrowser === b.id
                  ? 'bg-emerald-700/30 border-emerald-600 text-emerald-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
              }`}>
                <input
                  type="radio"
                  name="url-browser"
                  value={b.id}
                  checked={selectedBrowser === b.id}
                  onChange={() => onBrowserChange(b.id)}
                  className="accent-emerald-500 cursor-pointer"
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
