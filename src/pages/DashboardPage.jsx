import { useOrders } from '../hooks/useOrders'

const STATUSES = ['Received', 'Confirmed', 'In Production', 'Shipped', 'Completed']

function StatCard({ label, num }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="num">{num}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { orders } = useOrders()

  const total    = orders.length
  const active   = orders.filter(o => o.status !== 'Completed').length
  const newCount = orders.filter(o => o.order_type === 'NEW ORDER').length
  const repeat   = orders.filter(o => o.order_type === 'REPEAT ORDER').length
  const totalQty = orders.reduce((sum, o) => {
    const n = parseInt(String(o.qty).replace(/[^0-9]/g, ''))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  return (
    <>
      <div className="stats">
        <StatCard label="Total orders"   num={total} />
        <StatCard label="Active (open)"  num={active} />
        <StatCard label="New orders"     num={newCount} />
        <StatCard label="Repeat orders"  num={repeat} />
        <StatCard label="Total units"    num={totalQty.toLocaleString()} />
      </div>

      <div className="card">
        <div className="brandname">Orders by status</div>
        <div style={{ marginTop: 8 }}>
          {STATUSES.map(s => {
            const count = orders.filter(o => o.status === s).length
            const pct   = total ? Math.round((count / total) * 100) : 0
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