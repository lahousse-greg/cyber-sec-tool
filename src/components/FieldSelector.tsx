import { useState } from 'react'
import { Plus, Trash2, ScanSearch, Loader2 } from 'lucide-react'

export interface TargetField {
  id: string
  name: string
  automationTarget?: { url: string; selector: string }
}

export interface DiscoveredField {
  index: number
  type: string
  name: string
  id: string
  placeholder: string
  label: string
  selector: string
  displayName: string
}

interface Props {
  suggestions: string[]
  description?: string
  onChange: (activeFields: TargetField[]) => void
  /** When true, the "Automated" tab is shown and /api/scan-fields is available */
  apiAvailable?: boolean
}

let fieldIdCounter = 0
const makeField = (name = ''): TargetField => ({ id: `field-${++fieldIdCounter}`, name })

type Mode = 'manual' | 'automated'
type ScanStatus = 'idle' | 'loading-page' | 'extracting' | 'done' | 'error'

export default function FieldSelector({ suggestions, description, onChange, apiAvailable }: Props) {
  // ── manual mode state ──────────────────────────────────────────────
  const [fields, setFields] = useState<TargetField[]>([makeField()])

  // ── automated mode state ───────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('manual')
  const [scanUrl, setScanUrl] = useState('')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scanError, setScanError] = useState('')
  const [discoveredFields, setDiscoveredFields] = useState<DiscoveredField[]>([])
  const [selectedDiscoveredIdx, setSelectedDiscoveredIdx] = useState<number | null>(null)

  // ── manual helpers ─────────────────────────────────────────────────
  const notify = (updated: TargetField[]) =>
    onChange(updated.filter(f => f.name.trim() !== ''))

  const updateField = (id: string, name: string) => {
    const next = fields.map(f => f.id === id ? { ...f, name } : f)
    setFields(next)
    notify(next)
  }

  const addField = () => {
    const next = [...fields, makeField()]
    setFields(next)
    notify(next)
  }

  const removeField = (id: string) => {
    if (fields.length === 1) return
    const next = fields.filter(f => f.id !== id)
    setFields(next)
    notify(next)
  }

  const addSuggestion = (name: string) => {
    if (fields.some(f => f.name.toLowerCase() === name.toLowerCase())) return
    const blank = fields.find(f => f.name.trim() === '')
    const next = blank
      ? fields.map(f => f.id === blank.id ? { ...f, name } : f)
      : [...fields, makeField(name)]
    setFields(next)
    notify(next)
  }

  // ── mode switch ────────────────────────────────────────────────────
  const switchMode = (next: Mode) => {
    setMode(next)
    if (next === 'manual') {
      onChange(fields.filter(f => f.name.trim() !== ''))
    } else {
      // report the already-selected discovered field (if any)
      if (selectedDiscoveredIdx !== null) {
        const df = discoveredFields.find(f => f.index === selectedDiscoveredIdx)
        if (df) onChange([makeAutomatedField(df)])
        else onChange([])
      } else {
        onChange([])
      }
    }
  }

  // ── automated helpers ──────────────────────────────────────────────
  const makeAutomatedField = (df: DiscoveredField): TargetField => ({
    id: `discovered-${df.index}`,
    name: df.displayName,
    automationTarget: { url: scanUrl, selector: df.selector },
  })

  const handleScan = async () => {
    const url = scanUrl.trim()
    if (!url) return
    setScanStatus('loading-page')
    setScanError('')
    setDiscoveredFields([])
    setSelectedDiscoveredIdx(null)
    onChange([])
    try {
      const res = await fetch('/api/scan-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setScanStatus('extracting')
      const data = await res.json() as { ok: boolean; fields?: DiscoveredField[]; error?: string }
      if (!data.ok || !data.fields) {
        setScanError(data.error ?? 'Scan failed')
        setScanStatus('error')
      } else {
        setDiscoveredFields(data.fields)
        setScanStatus('done')
      }
    } catch {
      setScanError('Could not reach /api/scan-fields — is the dev server running?')
      setScanStatus('error')
    }
  }

  const handleDiscoveredSelect = (df: DiscoveredField) => {
    setSelectedDiscoveredIdx(df.index)
    onChange([makeAutomatedField(df)])
  }

  return (
    <div className="space-y-3">
      {apiAvailable && (
        <div className="flex gap-1 p-0.5 bg-gray-800 rounded-lg w-fit">
          <button
            onClick={() => switchMode('manual')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'manual' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => switchMode('automated')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'automated' ? 'bg-gray-700 text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <ScanSearch size={11} />
            Automated
          </button>
        </div>
      )}

      {/* ── Manual mode ── */}
      <div className={mode === 'manual' ? 'space-y-3' : 'hidden'}>
        {description && <p className="text-xs text-gray-500">{description}</p>}

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

        <button
          onClick={addField}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Plus size={13} /> Add field
        </button>

        <div className="space-y-1.5">
          <p className="text-xs text-gray-600">Suggestions</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(s => {
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
      </div>

      {/* ── Automated mode ── */}
      {mode === 'automated' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Enter the URL of the page with the form. The tool will open it in a headless browser, detect all text inputs, and let you pick one to target.
          </p>

          <div className="flex gap-2">
            <input
              type="url"
              value={scanUrl}
              onChange={e => { setScanUrl(e.target.value); setScanStatus('idle') }}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://myapp.local/login"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleScan}
              disabled={!scanUrl.trim() || scanStatus === 'loading-page' || scanStatus === 'extracting'}
              className="flex items-center gap-2 px-4 py-2 bg-sky-700 hover:bg-sky-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              {(scanStatus === 'loading-page' || scanStatus === 'extracting')
                ? <><Loader2 size={14} className="animate-spin" /> Scanning…</>
                : <><ScanSearch size={14} /> Scan Fields</>
              }
            </button>
          </div>

          {scanStatus === 'loading-page' && (
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <Loader2 size={12} className="animate-spin shrink-0" />
              Opening page and waiting for DOM to load…
            </div>
          )}

          {scanStatus === 'extracting' && (
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <Loader2 size={12} className="animate-spin shrink-0" />
              DOM loaded — extracting input fields…
            </div>
          )}

          {scanStatus === 'error' && (
            <p className="text-xs text-red-400">{scanError}</p>
          )}

          {scanStatus === 'done' && discoveredFields.length === 0 && (
            <p className="text-xs text-gray-500">No text inputs or textareas found on this page.</p>
          )}

          {discoveredFields.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">
                {discoveredFields.length} field{discoveredFields.length !== 1 ? 's' : ''} found — select one to target:
              </p>
              <div className="space-y-1">
                {discoveredFields.map(df => (
                  <label
                    key={df.index}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedDiscoveredIdx === df.index
                        ? 'bg-sky-900/30 border-sky-700 text-sky-200'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="discovered-field"
                      checked={selectedDiscoveredIdx === df.index}
                      onChange={() => handleDiscoveredSelect(df)}
                      className="accent-sky-500 shrink-0"
                    />
                    <span className="text-sm font-medium">{df.displayName}</span>
                    <span className="text-xs text-gray-600 font-mono ml-auto">{df.selector}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                      df.type === 'textarea' ? 'bg-purple-900/50 text-purple-300' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {df.type}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
