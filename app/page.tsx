'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, X, Plus, Trash2, ChevronDown, ChevronLeft, ChevronRight, BarChart3, Settings, CalendarDays } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────────────── */
type Habit = {
  id: number
  name: string
  color: string
  completions: string[]
  createdAt: string
}

type Tab = 'calendar' | 'statistics' | 'manage'

/* ── Constants ─────────────────────────────────────────────────── */
const STORAGE_KEY = 'habit-log-v4'
const COLORS = ['#3b82f6', '#facc15', '#e879f9', '#34d399', '#fb923c', '#f87171']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/* ── Date Helpers ──────────────────────────────────────────────── */
function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function today() { const d = new Date(); d.setHours(12, 0, 0, 0); return d }
function parseDate(s: string) { return new Date(`${s}T12:00:00`) }

/* ── Grid for a selected year ──────────────────────────────────── */
function buildYearGrid(year: number) {
  const now = today()
  const currentYear = now.getFullYear()
  const jan1 = new Date(year, 0, 1, 12, 0, 0)
  const start = new Date(jan1)
  start.setDate(start.getDate() - start.getDay())

  const endDate = year === currentYear ? now : new Date(year, 11, 31, 12, 0, 0)

  const days: Date[] = []
  const cursor = new Date(start)
  while (cursor <= endDate) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1) }
  while (days.length % 7 !== 0) { days.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1) }
  return days
}

function getMonthLabels(days: Date[]) {
  const labels: { label: string; col: number }[] = []
  for (let i = 0; i < days.length; i += 7) {
    const weekStart = days[i]
    if (i === 0 || weekStart.getMonth() !== days[i - 7]?.getMonth()) {
      labels.push({ label: weekStart.toLocaleString('en-US', { month: 'short' }), col: i / 7 })
    }
  }
  return labels
}

/* ── Stats ─────────────────────────────────────────────────────── */
function statsFor(habit: Habit) {
  const set = new Set(habit.completions)
  const now = today()

  let streak = 0
  const cur = new Date(now)
  while (set.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1) }

  const sorted = [...set].sort()
  let best = 0, run = 0
  let prev: Date | null = null
  for (const s of sorted) {
    const d = parseDate(s)
    if (prev) { const gap = Math.round((d.getTime() - prev.getTime()) / 86400000); run = gap === 1 ? run + 1 : 1 } else run = 1
    best = Math.max(best, run)
    prev = d
  }

  const createdDate = habit.createdAt ? parseDate(habit.createdAt) : (sorted.length ? parseDate(sorted[0]) : now)
  const totalDays = Math.max(1, Math.round((now.getTime() - createdDate.getTime()) / 86400000) + 1)
  const completion = Math.round((set.size / totalDays) * 100)
  return { streak, best, completion, total: set.size }
}

/* ── Weekly Stats ──────────────────────────────────────────────── */
function getWeeklyStats(habits: Habit[], weeksBack = 12) {
  const now = today()
  const weeks: { label: string; pct: number; completed: number; total: number }[] = []
  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() - w * 7)
    const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
    let completed = 0, total = 0
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = iso(d)
      for (const habit of habits) {
        if (habit.createdAt && dateStr >= habit.createdAt) { total++; if (habit.completions.includes(dateStr)) completed++ }
      }
    }
    weeks.push({ label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), pct: total > 0 ? Math.round((completed / total) * 100) : 0, completed, total })
  }
  return weeks
}

/* ── Year Selector ─────────────────────────────────────────────── */
function YearSelector({ year, onChange, minYear }: { year: number; onChange: (y: number) => void; minYear: number }) {
  const currentYear = today().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= minYear; y--) years.push(y)

  return (
    <div className="year-selector">
      <button className="year-arrow" onClick={() => year > minYear && onChange(year - 1)} disabled={year <= minYear} aria-label="Previous year"><ChevronLeft size={14} /></button>
      <div className="year-dropdown-wrap">
        <select className="year-dropdown" value={year} onChange={e => onChange(Number(e.target.value))} aria-label="Select year">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <ChevronDown size={12} className="year-dropdown-icon" />
      </div>
      <button className="year-arrow" onClick={() => year < currentYear && onChange(year + 1)} disabled={year >= currentYear} aria-label="Next year"><ChevronRight size={14} /></button>
    </div>
  )
}

/* ── HeatMap ───────────────────────────────────────────────────── */
function HeatMap({ habit, year }: { habit: Habit; year: number }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days = useMemo(() => buildYearGrid(year), [year])
  const labels = useMemo(() => getMonthLabels(days), [days])
  const set = useMemo(() => new Set(habit.completions), [habit.completions])
  const totalCols = Math.ceil(days.length / 7)
  const nowDate = today()
  const currentYear = nowDate.getFullYear()

  useEffect(() => {
    if (scrollRef.current && year === currentYear) {
      const id = setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      }, 50)
      return () => clearTimeout(id)
    }
  }, [year, currentYear])

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-inner">
        {/* Month labels on top */}
        <div className="month-row" style={{ gridTemplateColumns: `repeat(${totalCols}, 14px)`, marginLeft: '28px' }}>
          {Array.from({ length: totalCols }, (_, i) => {
            const lbl = labels.find(l => l.col === i)
            return <span key={i}>{lbl ? lbl.label : ''}</span>
          })}
        </div>
        <div className="heatmap-body">
          <div className="weekday-col">
            {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="heatmap-scroll" ref={scrollRef}>
            <div className="cells" style={{ gridTemplateColumns: `repeat(${totalCols}, 14px)` }}>
              {days.map(day => {
                const key = iso(day)
                const done = set.has(key)
                const isFuture = day > nowDate
                const outside = day.getFullYear() !== year
                return (
                  <span
                    key={key}
                    className={`cell${done ? ' done' : ''}${isFuture || outside ? ' faded' : ''}`}
                    style={done ? { backgroundColor: habit.color } : undefined}
                    title={key}
                  />
                )
              })}
            </div>
          </div>
        </div>
        <div className="legend-row">
          <span>Less</span>
          <span className="legend-block" style={{ background: '#1b1e22' }} />
          {[0.3, 0.55, 0.8, 1].map((a, i) => (
            <span key={i} className="legend-block" style={{ backgroundColor: habit.color, opacity: a }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

/* ── Edit Menu ─────────────────────────────────────────────────── */
function EditMenu({ habit, onSave, onDelete, onClose }: {
  habit: Habit; onSave: (id: number, u: Partial<Habit>) => void; onDelete: (id: number) => void; onClose: () => void
}) {
  const [name, setName] = useState(habit.name)
  const [color, setColor] = useState(habit.color)
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <>
      <div className="edit-backdrop" onClick={onClose} />
      <div className="edit-menu">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} autoFocus /></label>
        <label>Color
          <div className="color-pick">{COLORS.map(c => (
            <button key={c} type="button" className={`cdot${color === c ? ' sel' : ''}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
          ))}</div>
        </label>
        <div className="edit-actions">
          {confirmDel ? (
            <div className="confirm-row">
              <span className="confirm-text">Delete?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(habit.id); onClose() }}>Yes</button>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmDel(false)}>No</button>
            </div>
          ) : (
            <>
              <button className="btn btn-danger" onClick={() => setConfirmDel(true)}><Trash2 size={13} /> Delete</button>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => { onSave(habit.id, { name: name.trim() || habit.name, color }); onClose() }}>Save</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Habit Card (3-column) ─────────────────────────────────────── */
function HabitCard({ habit, year, onDone, onUpdate, onDelete }: {
  habit: Habit; year: number
  onDone: (id: number) => void; onUpdate: (id: number, u: Partial<Habit>) => void; onDelete: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const todayStr = iso(new Date())
  const done = habit.completions.includes(todayStr)
  const stats = statsFor(habit)

  return (
    <article className="habit-card">
      {/* Edit button top-right */}
      <button className="edit-link" onClick={() => setEditing(v => !v)}>
        {editing ? <X size={14} /> : <Pencil size={14} />}
      </button>

      {/* 3-column layout */}
      <div className="card-grid">
        {/* Left: info */}
        <div className="card-left">
          <button
            className={`check${done ? ' checked' : ''}`}
            style={done ? { backgroundColor: habit.color, borderColor: habit.color } : undefined}
            onClick={() => !done && onDone(habit.id)}
            disabled={done}
            title={done ? 'Completed — cannot be undone' : 'Mark as done for today'}
          >
            {done ? '✓' : ''}
          </button>
          <h2>{habit.name.toUpperCase()}</h2>
          <div className="badges">
            <span className="badge-streak" style={{ color: habit.color }}>
              {stats.streak ? `${stats.streak}-day streak` : 'No streak'}
            </span>
            <span className="badge-stat">Best: {stats.best}d</span>
          </div>
          <span className="badge-pct">{stats.completion}%</span>
        </div>

        {/* Center: heatmap */}
        <HeatMap habit={habit} year={year} />

        {/* Right: stats panel */}
        <div className="card-right">
          <div className="stat-row">Streak <strong>{stats.streak} days</strong></div>
          <div className="stat-row">Best <strong>{stats.best}d</strong></div>
          <div className="stat-row">Completion <strong>{stats.completion}%</strong></div>
        </div>
      </div>

      {editing && <EditMenu habit={habit} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditing(false)} />}
    </article>
  )
}

/* ── Statistics View ───────────────────────────────────────────── */
function StatisticsView({ habits }: { habits: Habit[] }) {
  const weeks = useMemo(() => getWeeklyStats(habits, 12), [habits])
  const maxPct = Math.max(...weeks.map(w => w.pct), 1)
  const habitStats = useMemo(() => habits.map(h => ({ ...h, stats: statsFor(h) })), [habits])
  const totalCompleted = habitStats.reduce((s, h) => s + h.stats.total, 0)
  const avgCompletion = habits.length > 0 ? Math.round(habitStats.reduce((s, h) => s + h.stats.completion, 0) / habits.length) : 0
  const bestOverall = Math.max(0, ...habitStats.map(h => h.stats.best))

  return (
    <div className="stats-view">
      <div className="stats-summary">
        <div className="summary-card"><span className="sv">{totalCompleted}</span><span className="sl">Total check-ins</span></div>
        <div className="summary-card"><span className="sv">{avgCompletion}%</span><span className="sl">Avg completion</span></div>
        <div className="summary-card"><span className="sv">{bestOverall}d</span><span className="sl">Best streak</span></div>
        <div className="summary-card"><span className="sv">{habits.length}</span><span className="sl">Active habits</span></div>
      </div>
      <div className="chart-card">
        <h3>Weekly Completion Rate</h3>
        <div className="bar-chart">
          {weeks.map((w, i) => (
            <div className="bar-col" key={i}>
              <div className="bar-tip">{w.pct}%</div>
              <div className="bar-track"><div className="bar-fill" style={{ height: `${(w.pct / maxPct) * 100}%` }} /></div>
              <span className="bar-lbl">{w.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-card">
        <h3>Per-Habit Breakdown</h3>
        <div className="breakdown">
          {habitStats.map(h => (
            <div className="bd-row" key={h.id}>
              <span className="bd-dot" style={{ backgroundColor: h.color }} />
              <span className="bd-name">{h.name}</span>
              <div className="bd-track"><div className="bd-fill" style={{ width: `${h.stats.completion}%`, backgroundColor: h.color }} /></div>
              <span className="bd-pct">{h.stats.completion}%</span>
              <span className="bd-streak" style={{ color: h.color }}>{h.stats.streak > 0 ? `${h.stats.streak}d` : '—'}</span>
            </div>
          ))}
          {habits.length === 0 && <p className="empty">No habits yet.</p>}
        </div>
      </div>
    </div>
  )
}

/* ── Manage View ───────────────────────────────────────────────── */
function ManageView({ habits, onUpdate, onDelete, onAdd }: {
  habits: Habit[]; onUpdate: (id: number, u: Partial<Habit>) => void; onDelete: (id: number) => void; onAdd: () => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  return (
    <div className="manage-view">
      <div className="manage-header"><h3>{habits.length} Habit{habits.length !== 1 ? 's' : ''}</h3><button className="btn btn-primary" onClick={onAdd}><Plus size={14} /> Add</button></div>
      {habits.length === 0 && <p className="empty">No habits yet.</p>}
      <div className="manage-list">
        {habits.map(h => {
          const stats = statsFor(h)
          const isEd = editingId === h.id
          return (
            <div className="manage-card" key={h.id}>
              <div className="manage-main">
                <span className="manage-dot" style={{ backgroundColor: h.color }} />
                <div className="manage-info"><strong>{h.name}</strong><span className="manage-meta">Created {h.createdAt} · {stats.total} check-ins · {stats.completion}%</span></div>
                <button className="icon-btn" onClick={() => setEditingId(isEd ? null : h.id)}>{isEd ? <X size={15} /> : <Pencil size={15} />}</button>
              </div>
              {isEd && <EditMenu habit={h} onSave={onUpdate} onDelete={onDelete} onClose={() => setEditingId(null)} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function Page() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState<Tab>('calendar')
  const [year, setYear] = useState(today().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(COLORS[0])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { try { const p = JSON.parse(raw) as Habit[]; if (Array.isArray(p)) setHabits(p) } catch {} }
    setLoaded(true)
  }, [])
  useEffect(() => { if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)) }, [habits, loaded])

  const minYear = useMemo(() => {
    if (!habits.length) return today().getFullYear()
    return habits.reduce((m, h) => { const y = h.createdAt ? parseInt(h.createdAt.slice(0, 4)) : today().getFullYear(); return y < m ? y : m }, today().getFullYear())
  }, [habits])

  const markDone = useCallback((id: number) => {
    const t = iso(new Date())
    setHabits(c => c.map(h => h.id === id && !h.completions.includes(t) ? { ...h, completions: [...h.completions, t] } : h))
  }, [])
  const updateHabit = useCallback((id: number, u: Partial<Habit>) => { setHabits(c => c.map(h => h.id === id ? { ...h, ...u } : h)) }, [])
  const deleteHabit = useCallback((id: number) => { setHabits(c => c.filter(h => h.id !== id)) }, [])
  const addHabit = (e: React.FormEvent) => {
    e.preventDefault(); if (!newName.trim()) return
    setHabits(c => [...c, { id: Date.now(), name: newName.trim(), color: newColor, completions: [], createdAt: iso(new Date()) }])
    setNewName(''); setNewColor(COLORS[0]); setShowForm(false)
  }

  return (
    <main className="shell">
      {/* ── Header ── */}
      <header className="topbar">
        <div className="brand">
          <span className="eyebrow">DAILY RHYTHM</span>
          <h1>Habit log</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-nav">
            <button className={`nav-tab${tab === 'calendar' ? ' active' : ''}`} onClick={() => setTab('calendar')}>
              <CalendarDays size={14} /> Calendar
            </button>
            <button className={`nav-tab${tab === 'statistics' ? ' active' : ''}`} onClick={() => setTab('statistics')}>
              <BarChart3 size={14} /> Statistics
            </button>
            <button className={`nav-tab${tab === 'manage' ? ' active' : ''}`} onClick={() => setTab('manage')}>
              <Settings size={14} /> Manage
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Habit</button>
        </div>
      </header>

      {/* ── Sub bar ── */}
      <div className="sub-bar">
        <p className="sub-left">Last 365 days</p>
        <div className="sub-right">
          {tab === 'calendar' && <YearSelector year={year} onChange={setYear} minYear={minYear} />}
          <span className="sub-count">{habits.length} active</span>
        </div>
      </div>

      {/* ── Inline Add Form ── */}
      {showForm && (
        <form className="add-form" onSubmit={addHabit}>
          <label className="af-field"><span className="af-label">Name</span><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. WALK" autoFocus /></label>
          <label className="af-field"><span className="af-label">Color</span>
            <div className="color-pick">{COLORS.map(c => <button key={c} type="button" className={`cdot${newColor === c ? ' sel' : ''}`} style={{ backgroundColor: c }} onClick={() => setNewColor(c)} />)}</div>
          </label>
          <div className="af-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" type="submit">Create habit</button>
          </div>
        </form>
      )}

      {/* ── Calendar ── */}
      {tab === 'calendar' && (
        <section className="habit-list">
          {habits.map(h => <HabitCard key={h.id} habit={h} year={year} onDone={markDone} onUpdate={updateHabit} onDelete={deleteHabit} />)}
          {habits.length === 0 && !showForm && <p className="empty">No habits yet. Click &quot;+ Add Habit&quot; to begin.</p>}
        </section>
      )}
      {tab === 'statistics' && <StatisticsView habits={habits} />}
      {tab === 'manage' && <ManageView habits={habits} onUpdate={updateHabit} onDelete={deleteHabit} onAdd={() => setShowForm(true)} />}

      {/* ── Footer ── */}
      <footer className="app-footer">{habits.length} ACTIVE HABITS</footer>
    </main>
  )
}
