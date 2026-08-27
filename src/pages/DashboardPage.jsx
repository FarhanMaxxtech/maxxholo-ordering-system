import { useState, useMemo } from 'react'
import { useOrders } from '../hooks/useOrders'

//const STATUSES = ['Received', 'Confirmed', 'In Production', 'Shipped', 'Completed']
const STATUSES = ['Pending', 'In Production', 'Shipped', 'Completed']

function StatCard({ label, num }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="num">{num}</div>
    </div>
  )
}

// ── Build a "YYYY-MM" key + friendly label from a date string ──
function monthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
}

export default function DashboardPage() {
  const { orders } = useOrders()
  const [selectedMonth, setSelectedMonth] = useState('all')

  // ── Build the list of months that actually exist in the data ──
  const availableMonths = useMemo(() => {
    const set = new Set()
    orders.forEach(o => {
      const key = monthKey(o.created_at)
      if (key) set.add(key)
    })
    // Newest first
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [orders])

  // ── Apply the month filter ──
  const filtered = useMemo(() => {
    if (selectedMonth === 'all') return orders
    return orders.filter(o => monthKey(o.created_at) === selectedMonth)
  }, [orders, selectedMonth])

  const total    = filtered.length
  const active   = filtered.filter(o => o.status !== 'Completed').length
  const newCount = filtered.filter(o => o.order_type === 'NEW ORDER').length
  const repeat   = filtered.filter(o => o.order_type === 'REPEAT ORDER').length
  const totalQty = filtered.reduce((sum, o) => {
    const n = parseInt(String(o.qty).replace(/[^0-9]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <>
      {/* ── Month filter ── */}
      <div className="toolbar">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          <option value="all">All time</option>
          {availableMonths.map(key => (
            <option key={key} value={key}>{monthLabel(key)}</option>
          ))}
        </select>
        <span className="spacer" />
        {selectedMonth !== 'all' && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Showing {total} order{total !== 1 ? 's' : ''} for {monthLabel(selectedMonth)}
          </span>
        )}
      </div>

      <div className="stats">
        <StatCard label="Total orders"   num={total} />
        <StatCard label="Active (open)"  num={active} />
        <StatCard label="New orders"     num={newCount} />
        <StatCard label="Repeat orders"  num={repeat} />
        <StatCard label="Total units"    num={totalQty.toLocaleString()} />
      </div>

      <div className="card dashboard-panel">
        <div className="brandname">Orders by status</div>
        <div style={{ marginTop: 8 }}>
          {STATUSES.map(s => {
            const count = filtered.filter(o => o.status === s).length
            const maxCount = Math.max(...STATUSES.map(st => filtered.filter(o => o.status === st).length), 1)
            const pct = count > 0
              ? Math.max((Math.log(count + 1) / Math.log(maxCount + 1)) * 100, 3)
              : 0
            return (
              <div key={s} style={{ margin: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span>{s}</span>
                  <span style={{ color: 'var(--muted)' }}>{count}</span>
                </div>
                <div style={{ background: 'var(--panel2)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}