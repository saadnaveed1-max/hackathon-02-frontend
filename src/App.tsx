import { useCallback, useMemo, useState, type FormEvent } from 'react'
import './App.css'
import {
  briefOutputToCsv,
  briefOutputToMarkdown,
  downloadText,
} from './export-utils'
import type { BriefOutput, WorkItem } from './types/brief-output'

type Tab = 'overview' | 'tree' | 'gaps' | 'export'

function getTransformUrl(): string {
  const base = import.meta.env.VITE_API_URL
  if (typeof base === 'string' && base.trim()) {
    return `${base.replace(/\/$/, '')}/briefs/transform`
  }
  return '/api/briefs/transform'
}

function buildChildrenMap(items: WorkItem[]): Map<string | null, WorkItem[]> {
  const map = new Map<string | null, WorkItem[]>()
  for (const w of items) {
    const p = w.parentId ?? null
    if (!map.has(p)) map.set(p, [])
    map.get(p)!.push(w)
  }
  for (const list of Array.from(map.values())) {
    list.sort((a, b) => a.title.localeCompare(b.title))
  }
  return map
}

function WorkTree({ items }: { items: WorkItem[] }) {
  const children = useMemo(() => buildChildrenMap(items), [items])

  const initiallyOpen = useMemo(() => {
    const s = new Set<string>()
    for (const w of items) {
      if ((children.get(w.id)?.length ?? 0) > 0) s.add(w.id)
    }
    return s
  }, [items, children])

  const [open, setOpen] = useState<Set<string>>(() => new Set(initiallyOpen))

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const Branch = ({ parentId }: { parentId: string | null }) => {
    const list = children.get(parentId) ?? []
    if (list.length === 0) return null
    return (
      <ul className="tree">
        {list.map((w) => {
          const sub = children.get(w.id) ?? []
          const hasKids = sub.length > 0
          const expanded = open.has(w.id)
          return (
            <li key={w.id}>
              <div className="tree-row">
                {hasKids ? (
                  <button
                    type="button"
                    className="tree-toggle"
                    aria-expanded={expanded}
                    onClick={() => toggle(w.id)}
                  >
                    {expanded ? '▼' : '▶'}
                  </button>
                ) : (
                  <span className="tree-spacer" aria-hidden />
                )}
                <span className="tree-type">{w.type}</span>
                <span className="tree-title">{w.title}</span>
              </div>
              {w.description ? (
                <p className="tree-desc">{w.description}</p>
              ) : null}
              {w.acceptanceCriteria.length > 0 ? (
                <ul className="tree-ac">
                  {w.acceptanceCriteria.map((ac, i) => (
                    <li key={`${w.id}-ac-${i}`}>
                      {ac.text}
                      {ac.status === 'stated' && ac.evidenceQuote ? (
                        <span className="ac-evidence">
                          {' '}
                          (brief: “{ac.evidenceQuote}”)
                        </span>
                      ) : (
                        <span className="ac-tbd"> (TBD)</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
              {hasKids && expanded ? <Branch parentId={w.id} /> : null}
            </li>
          )
        })}
      </ul>
    )
  }

  return <Branch parentId={null} />
}

function formatApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed.'
  const d = data as Record<string, unknown>
  const msg = d.message
  if (msg && typeof msg === 'object') {
    const m = msg as Record<string, unknown>
    if (Array.isArray(m.errors)) {
      return m.errors.map(String).join(' ')
    }
    if (typeof m.message === 'string') return m.message
  }
  if (typeof msg === 'string') return msg
  if (Array.isArray(d.message)) return d.message.map(String).join(' ')
  return 'Request failed.'
}

export default function App() {
  const [text, setText] = useState('')
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BriefOutput | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(getTransformUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(formatApiError(data))
      }
      setResult(data as BriefOutput)
      setTab('overview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const jsonExport = useMemo(
    () => (result ? JSON.stringify(result, null, 2) : ''),
    [result],
  )
  const csvExport = useMemo(
    () => (result ? briefOutputToCsv(result) : ''),
    [result],
  )
  const mdExport = useMemo(
    () => (result ? briefOutputToMarkdown(result) : ''),
    [result],
  )

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setError(null)
    } catch {
      setError(`Could not copy ${label} to the clipboard.`)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Brief → dev tasks</h1>
        <p className="app-lede">
          Paste a client brief. The model returns a structured breakdown, gaps
          for the client, and exports you can paste into Jira or a CSV import.
        </p>
      </header>

      <form className="brief-form" onSubmit={onSubmit}>
        <label htmlFor="brief">Client brief</label>
        <textarea
          id="brief"
          name="brief"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full brief here…"
          disabled={loading}
          maxLength={100_000}
        />
        <div className="form-actions">
          <button type="submit" disabled={loading || !text.trim()}>
            {loading ? 'Generating…' : 'Generate breakdown'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="banner banner-error" role="alert">
          {error}
        </div>
      ) : null}

      {result ? (
        <section className="results" aria-live="polite">
          <nav className="tabs" aria-label="Result sections">
            {(
              [
                ['overview', 'Overview'],
                ['tree', 'Work tree'],
                ['gaps', 'Gaps'],
                ['export', 'Export'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'tab tab-active' : 'tab'}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === 'overview' ? (
            <div className="panel">
              {result.summary ? (
                <>
                  <h2>Summary</h2>
                  <p>{result.summary}</p>
                </>
              ) : null}
              {result.assumptionsPolicy ? (
                <>
                  <h2>Policy</h2>
                  <p className="muted">{result.assumptionsPolicy}</p>
                </>
              ) : null}
              <h2>Stats</h2>
              <ul className="stats">
                <li>{result.workItems.length} work items</li>
                <li>{result.gaps.length} client questions</li>
              </ul>
            </div>
          ) : null}

          {tab === 'tree' ? (
            <div className="panel panel-tree">
              <WorkTree
                key={result.workItems.map((w) => w.id).join('|')}
                items={result.workItems}
              />
            </div>
          ) : null}

          {tab === 'gaps' ? (
            <div className="panel">
              {result.gaps.length === 0 ? (
                <p className="muted">No gaps listed (brief may be fully specified).</p>
              ) : (
                <ol className="gaps-list">
                  {result.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}

          {tab === 'export' ? (
            <div className="panel export-panel">
              <p className="muted export-hint">
                CSV columns:{' '}
                <code>
                  issue_key_placeholder, summary, description,
                  acceptance_criteria, labels, depends_on
                </code>{' '}
                — adjust to your Jira CSV importer if column names differ.
              </p>
              <div className="export-grid">
                <div className="export-card">
                  <h3>JSON</h3>
                  <div className="export-actions">
                    <button
                      type="button"
                      onClick={() => copy(jsonExport, 'JSON')}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          'brief-output.json',
                          jsonExport,
                          'application/json',
                        )
                      }
                    >
                      Download
                    </button>
                  </div>
                  <pre className="export-preview">{jsonExport.slice(0, 1200)}</pre>
                </div>
                <div className="export-card">
                  <h3>CSV</h3>
                  <div className="export-actions">
                    <button
                      type="button"
                      onClick={() => copy(csvExport, 'CSV')}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          'brief-tickets.csv',
                          csvExport,
                          'text/csv;charset=utf-8',
                        )
                      }
                    >
                      Download
                    </button>
                  </div>
                  <pre className="export-preview">{csvExport.slice(0, 1200)}</pre>
                </div>
                <div className="export-card">
                  <h3>Markdown</h3>
                  <div className="export-actions">
                    <button type="button" onClick={() => copy(mdExport, 'Markdown')}>
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          'brief-tickets.md',
                          mdExport,
                          'text/markdown;charset=utf-8',
                        )
                      }
                    >
                      Download
                    </button>
                  </div>
                  <pre className="export-preview">{mdExport.slice(0, 1200)}</pre>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
