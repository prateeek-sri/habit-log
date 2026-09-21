'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, Star, LogOut } from 'lucide-react'
import { createHabit, updateHabit, deleteHabit, toggleStarHabit, logTime } from './actions'
import { signOut } from 'next-auth/react'

/* ── Types ─────────────────────────────────────────────────────── */
type Habit = {
  id: string
  name: string
  color: string
  completions: Record<string, number> 
  createdAt: string
  starred?: boolean
  dailyGoal: number 
}

type ViewMode = 'weekly' | 'monthly' | 'yearly'

/* ── Constants ─────────────────────────────────────────────────── */
const COLORS = ['#f87171', '#4ade80', '#ffffff', '#60a5fa', '#facc15', '#c084fc', '#38bdf8']

/* ── Helpers ───────────────────────────────────────────────────── */
function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function today() {
  const d = new Date()
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1)
  }
  d.setHours(12, 0, 0, 0)
  return d
}

function formatTime(minutes: number) {
  if (!minutes) return '--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

/* ── Views Components ──────────────────────────────────────────── */

function WeeklyGrid({ habit, onLogTime }: { habit: Habit, onLogTime: (date: string) => void }) {
  const todayStr = iso(today())
  const days = useMemo(() => {
    const arr = []
    for (let i = 6; i >= 0; i--) {
      const d = today()
      d.setDate(d.getDate() - i)
      arr.push(d)
    }
    return arr
  }, [])

  return (
    <div className="weekly-grid">
      <div className="weekly-headers">
        {days.map(d => (
          <span key={iso(d)}>{d.toLocaleString('en-US', { weekday: 'short' })}</span>
        ))}
      </div>
      <div className="weekly-squares">
        {days.map(d => {
          const dateStr = iso(d)
          const loggedMinutes = habit.completions[dateStr] || 0
          const fillPct = habit.dailyGoal > 0 ? Math.min(100, (loggedMinutes / habit.dailyGoal) * 100) : 0
          const isToday = dateStr === todayStr
          
          return (
            <button
              key={dateStr}
              className="w-square"
              style={{ cursor: isToday ? 'pointer' : 'default' }}
              onClick={() => isToday && onLogTime(dateStr)}
              title={`${dateStr}: ${formatTime(loggedMinutes)}`}
            >
              <div 
                className="fill-bg" 
                style={{ 
                  height: '100%', 
                  backgroundColor: habit.color,
                  opacity: fillPct > 0 ? Math.max(0.2, fillPct / 100) : 0
                }} 
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyGrid({ habit, onLogTime }: { habit: Habit, onLogTime: (date: string) => void }) {
  const todayStr = iso(today())
  const { days, blankDays } = useMemo(() => {
    const now = today()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const startDay = firstDay.getDay() 
    const daysInMonth = lastDay.getDate()
    
    const daysArr = []
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      d.setHours(12, 0, 0, 0)
      daysArr.push(d)
    }
    
    return { days: daysArr, blankDays: startDay }
  }, [])

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="monthly-grid">
      <div className="monthly-headers">
        {weekdays.map(w => <span key={w}>{w}</span>)}
      </div>
      <div className="monthly-squares">
        {Array.from({ length: blankDays }).map((_, i) => (
          <div key={`blank-${i}`} className="m-square empty" />
        ))}
        {days.map(d => {
          const dateStr = iso(d)
          const loggedMinutes = habit.completions[dateStr] || 0
          const fillPct = habit.dailyGoal > 0 ? Math.min(100, (loggedMinutes / habit.dailyGoal) * 100) : 0
          const isToday = dateStr === todayStr
          
          return (
            <button
              key={dateStr}
              className="m-square"
              style={{ cursor: isToday ? 'pointer' : 'default' }}
              onClick={() => isToday && onLogTime(dateStr)}
            >
              <span className="square-date">{d.getDate()}</span>
              <span className="square-time" style={{ color: loggedMinutes > 0 ? '#ffffff' : '#a0a5b8' }}>
                {formatTime(loggedMinutes)}
              </span>
              <div 
                className="fill-bg" 
                style={{ 
                  height: `${fillPct}%`, 
                  backgroundColor: habit.color,
                  opacity: fillPct > 0 ? 0.9 : 0
                }} 
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YearlyGrid({ habit, onLogTime }: { habit: Habit, onLogTime: (date: string) => void }) {
  const todayStr = iso(today())
  const days = useMemo(() => {
    const arr = []
    for (let i = 139; i >= 0; i--) {
      const d = today()
      d.setDate(d.getDate() - i)
      arr.push(d)
    }
    return arr
  }, [])

  return (
    <div className="yearly-grid">
      {days.map(d => {
        const dateStr = iso(d)
        const loggedMinutes = habit.completions[dateStr] || 0
        const fillPct = habit.dailyGoal > 0 ? Math.min(100, (loggedMinutes / habit.dailyGoal) * 100) : 0
        const isToday = dateStr === todayStr
        
        return (
          <button
            key={dateStr}
            className="y-square"
            style={{ cursor: isToday ? 'pointer' : 'default' }}
            onClick={() => isToday && onLogTime(dateStr)}
            title={`${dateStr}: ${formatTime(loggedMinutes)}`}
          >
             <div 
                className="fill-bg" 
                style={{ 
                  height: '100%', 
                  backgroundColor: habit.color,
                  opacity: fillPct > 0 ? Math.max(0.2, fillPct / 100) : 0
                }} 
              />
          </button>
        )
      })}
    </div>
  )
}

/* ── Habit Card ────────────────────────────────────────────────── */
function HabitCard({ habit, view, onLogTime, onEdit, onDelete, onToggleStar, isPending }: {
  habit: Habit
  view: ViewMode
  onLogTime: (id: string, dateStr: string) => void
  onEdit: (habit: Habit) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string, currentVal: boolean) => void
  isPending: boolean
}) {
  return (
    <article className="habit-card" style={{ opacity: isPending ? 0.7 : 1 }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2>{habit.name}</h2>
          <button 
            onClick={() => onToggleStar(habit.id, habit.starred || false)} 
            disabled={isPending}
            style={{ 
              color: habit.starred ? '#facc15' : '#a0a5b8', 
              display: 'flex', 
              alignItems: 'center',
              transition: 'color 0.2s'
            }}
          >
            <Star size={16} fill={habit.starred ? '#facc15' : 'none'} />
          </button>
        </div>
        <div className="card-actions">
          <button onClick={() => onEdit(habit)} disabled={isPending}><Pencil size={14} /></button>
          <button 
            onClick={() => !habit.starred && onDelete(habit.id)}
            disabled={isPending || habit.starred}
            style={{ 
              opacity: habit.starred ? 0.3 : 1, 
              cursor: habit.starred ? 'not-allowed' : 'pointer'
            }}
            title={habit.starred ? "Cannot delete a starred habit" : "Delete habit"}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      {view === 'weekly' && <WeeklyGrid habit={habit} onLogTime={(d) => onLogTime(habit.id, d)} />}
      {view === 'monthly' && <MonthlyGrid habit={habit} onLogTime={(d) => onLogTime(habit.id, d)} />}
      {view === 'yearly' && <YearlyGrid habit={habit} onLogTime={(d) => onLogTime(habit.id, d)} />}
    </article>
  )
}

/* ── Modals ────────────────────────────────────────────────────── */
function HabitModal({ initialHabit, onClose, onSave, isPending }: {
  initialHabit?: Habit | null
  onClose: () => void
  onSave: (h: Partial<Habit>) => void
  isPending: boolean
}) {
  const [name, setName] = useState(initialHabit?.name || '')
  const [color, setColor] = useState(initialHabit?.color || COLORS[0])
  
  const initialGoal = initialHabit?.dailyGoal || 120
  const [goalHours, setGoalHours] = useState(Math.floor(initialGoal / 60))
  const [goalMinutes, setGoalMinutes] = useState(initialGoal % 60)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <label>
          Habit Name
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Physics" 
            autoFocus 
            disabled={isPending}
          />
        </label>
        
        <label>
          Daily Goal
          <div className="time-inputs">
            <input 
              type="number" 
              min="0" 
              value={goalHours} 
              onChange={e => setGoalHours(Number(e.target.value))}
              disabled={isPending}
            /> 
            <span>h</span>
            <input 
              type="number" 
              min="0" 
              max="59" 
              value={goalMinutes} 
              onChange={e => setGoalMinutes(Number(e.target.value))}
              disabled={isPending}
            />
            <span>m</span>
          </div>
        </label>

        <label>
          Color
          <div className="color-picker">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                className={`color-swatch ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                disabled={isPending}
              />
            ))}
          </div>
        </label>
        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={onClose} disabled={isPending}>Cancel</button>
          <button 
            className="modal-btn primary" 
            disabled={isPending}
            onClick={() => {
              if (name.trim()) {
                const totalMinutes = goalHours * 60 + goalMinutes
                onSave({ name: name.trim(), color, dailyGoal: totalMinutes })
              }
            }}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LogTimeModal({ initialMinutes, dateStr, onClose, onSave, isPending }: {
  initialMinutes: number
  dateStr: string
  onClose: () => void
  onSave: (minutes: number) => void
  isPending: boolean
}) {
  const [hours, setHours] = useState(Math.floor(initialMinutes / 60))
  const [minutes, setMinutes] = useState(initialMinutes % 60)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <label style={{ fontSize: '15px' }}>
          Log Time for Today
        </label>
        <div className="time-inputs" style={{ marginTop: '8px' }}>
          <input 
            type="number" 
            min="0" 
            value={hours} 
            onChange={e => setHours(Number(e.target.value))}
            autoFocus
            disabled={isPending}
          /> 
          <span>h</span>
          <input 
            type="number" 
            min="0" 
            max="59" 
            value={minutes} 
            onChange={e => setMinutes(Number(e.target.value))}
            disabled={isPending}
          />
          <span>m</span>
        </div>
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="modal-btn secondary" onClick={onClose} disabled={isPending}>Cancel</button>
          <button 
            className="modal-btn primary" 
            disabled={isPending}
            onClick={() => {
              onSave(hours * 60 + minutes)
            }}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Client Page ─────────────────────────────────────────────────── */
export default function ClientPage({ initialHabits }: { initialHabits: Habit[] }) {
  const [view, setView] = useState<ViewMode>('monthly')
  const [editingHabit, setEditingHabit] = useState<Habit | null | 'new'>(null)
  const [loggingTimeFor, setLoggingTimeFor] = useState<{ habitId: string, dateStr: string, currentMinutes: number } | null>(null)
  
  const [isPending, startTransition] = useTransition()

  const openLogTime = (id: string, dateStr: string) => {
    if (dateStr !== iso(today())) return
    const habit = initialHabits.find(h => h.id === id)
    if (!habit) return
    setLoggingTimeFor({ habitId: id, dateStr, currentMinutes: habit.completions[dateStr] || 0 })
  }

  const handleSaveLogTime = (minutes: number) => {
    if (!loggingTimeFor) return
    startTransition(async () => {
      await logTime(loggingTimeFor.habitId, loggingTimeFor.dateStr, minutes)
      setLoggingTimeFor(null)
    })
  }

  const handleSaveHabit = (data: Partial<Habit>) => {
    startTransition(async () => {
      if (editingHabit === 'new') {
        await createHabit({ name: data.name!, color: data.color!, dailyGoal: data.dailyGoal! })
      } else if (editingHabit) {
        await updateHabit(editingHabit.id, data)
      }
      setEditingHabit(null)
    })
  }

  const handleDeleteHabit = (id: string) => {
    startTransition(async () => {
      await deleteHabit(id)
    })
  }

  const handleToggleStar = (id: string, currentStarred: boolean) => {
    startTransition(async () => {
      await toggleStarHabit(id, currentStarred)
    })
  }

  return (
    <main className="shell">
      {/* ── Header ── */}
      <header className="topbar">
        <div className="logo-dots">
          <div className="logo-dot" style={{ background: '#f87171' }} />
          <div className="logo-dot" style={{ background: '#4ade80' }} />
          <div className="logo-dot" style={{ background: '#ffffff' }} />
          <div className="logo-dot" style={{ background: '#60a5fa' }} />
          <div className="logo-dot" style={{ background: '#facc15' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="add-btn" onClick={() => setEditingHabit('new')}>
            <Plus size={16} />
          </button>
          <button className="add-btn" onClick={() => signOut({ callbackUrl: '/login' })} title="Sign Out">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── Habit List ── */}
      <section className="habit-list">
        {initialHabits.map(h => (
          <HabitCard
            key={h.id}
            habit={h}
            view={view}
            onLogTime={openLogTime}
            onEdit={setEditingHabit}
            onDelete={handleDeleteHabit}
            onToggleStar={handleToggleStar}
            isPending={isPending}
          />
        ))}
        {initialHabits.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6a7185', marginTop: '40px', fontSize: '14px' }}>
            No habits yet. Click + to add one.
          </div>
        )}
      </section>

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav-wrap">
        <nav className="bottom-nav">
          <button 
            className={`nav-item ${view === 'weekly' ? 'active' : ''}`}
            onClick={() => setView('weekly')}
          >
            <div className="icon-weekly nav-icon">
              {Array.from({length: 4}).map((_, i) => <div key={i} className="icon-weekly-bar" />)}
            </div>
          </button>
          
          <button 
            className={`nav-item ${view === 'monthly' ? 'active' : ''}`}
            onClick={() => setView('monthly')}
          >
            <div className="icon-monthly nav-icon">
              {Array.from({length: 6}).map((_, i) => <div key={i} className="icon-monthly-square" />)}
            </div>
          </button>

          <button 
            className={`nav-item ${view === 'yearly' ? 'active' : ''}`}
            onClick={() => setView('yearly')}
          >
            <div className="icon-yearly nav-icon">
              {Array.from({length: 9}).map((_, i) => <div key={i} className="icon-yearly-dot" />)}
            </div>
          </button>
        </nav>
      </div>
      
      {/* Page Indicators */}
      <div className="page-indicators">
        <div className={`page-dot ${view === 'weekly' ? 'active' : ''}`} />
        <div className={`page-dot ${view === 'monthly' ? 'active' : ''}`} />
        <div className={`page-dot ${view === 'yearly' ? 'active' : ''}`} />
      </div>

      {/* ── Modals ── */}
      {editingHabit && (
        <HabitModal
          initialHabit={editingHabit === 'new' ? null : editingHabit}
          onClose={() => setEditingHabit(null)}
          onSave={handleSaveHabit}
          isPending={isPending}
        />
      )}

      {loggingTimeFor && (
        <LogTimeModal
          initialMinutes={loggingTimeFor.currentMinutes}
          dateStr={loggingTimeFor.dateStr}
          onClose={() => setLoggingTimeFor(null)}
          onSave={handleSaveLogTime}
          isPending={isPending}
        />
      )}
    </main>
  )
}
