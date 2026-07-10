import StatusBadge from './StatusBadge'

const STATUSES = ['Pending', 'In Production', 'Shipped', 'Completed']

const COURIER_LABELS = {
  'fedex': 'FedEx',
  'gdex':  'GDEX',
  'other': 'Others',
}

const COURIER_TRACKING_URL = {
  'fedex': (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  'gdex':  (n) => `https://track.aftership.com/gdex/${n}`,
  'other': (n) => `https://track.aftership.com/${n}`,
}

const STEPS = [
  { key: 'Pending',       label: 'Pending',       icon: '⏳' },
  { key: 'In Production', label: 'In Production', icon: '🏭' },
  { key: 'Shipped',       label: 'Shipped',       icon: '📦' },
  { key: 'Completed',     label: 'Completed',     icon: '✓' },
]

function getStepIndex(status) {
  const i = STEPS.findIndex(s => s.key === status)
  return i === -1 ? 0 : i
}

function readOrderEditCounts() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem('maxxholo:order-edit-counts') || '{}')
  } catch {
    return {}
  }
}

export default function OrderCard({ order: o, isAdmin, onQuickStatus, onManage, onEditOrder }) {
  const hasTracking = o.tracking_number && o.courier
  const currentStep = getStepIndex(o.status)
  const orderEditUsed = Number(readOrderEditCounts()[o.id] || 0) >= 1
  const canEditOrder = !isAdmin && !orderEditUsed

  function openTracking() {
    const urlFn = COURIER_TRACKING_URL[o.courier] || COURIER_TRACKING_URL['other']
    window.open(urlFn(o.tracking_number), '_blank')
  }

  return (
    <div className="card">

      {/* ── Top ── */}
      <div className="top">
        <div>
          <div className="brandname">{o.brand}</div>
          <div className="company">{o.company}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {!isAdmin && (
            <button
              className="btn ghost sm"
              onClick={() => onEditOrder?.(o)}
              disabled={!canEditOrder}
              style={{ minWidth: 72, justifyContent:'center' }}
            >
              {orderEditUsed ? 'Locked' : 'Edit'}
            </button>
          )}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
            <span className={`pill ${o.order_type === 'NEW ORDER' ? 'new' : 'repeat'}`}>
              {o.order_type === 'NEW ORDER' ? 'NEW' : 'REPEAT'}
            </span>
            {o.status === 'Completed' && (
              <span style={{
                fontSize:10, fontWeight:700,
                background:'rgba(46,163,107,.2)',
                color:'var(--green)',
                padding:'2px 8px',
                borderRadius:20,
              }}>
                ✓ Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Details ── */}
      <div className="meta">
        <b>Product</b><span>{o.product || '—'}</span>
        <b>Qty</b><span>{(o.qty || o.qty === 0) ? `${o.qty}${o.colour ? ` · ${o.colour}` : ''}` : '—'}</span>
        <b>Sales</b><span>{o.pic || '—'}</span>
        <b>Serial</b><span>{o.serial || '—'}</span>
        <b>Factory out</b>
        <span>{(o.factory_out && o.factory_out !== '0000-00-00' && o.factory_out !== '0000-00-00 00:00:00') ? o.factory_out : '—'}</span>
        <b>Courier</b><span>{o.courier ? (COURIER_LABELS[o.courier] || o.courier) : '—'}</span>
        <b>Tracking</b><span>{o.tracking_number || '—'}</span>
        <b>Remark</b><span style={{ whiteSpace:'pre-wrap' }}>{o.remark ? o.remark : '—'}</span>
        <b>Reference</b>
        <span>
          {o.ref_link
            ? (<a href={o.ref_link} target="_blank" rel="noreferrer">View reference</a>)
            : '—'
          }
        </span>
      </div>

      {/* ── Horizontal Progress Tracker ── */}
      <div className="tracker-wrap">
        {/* Info bar */}
        <div className={`tracker-bar ${o.status === 'Pending' ? 'tracker-bar-pending' : o.status === 'In Production' ? 'tracker-bar-production' : o.status === 'Shipped' ? 'tracker-bar-shipped' : 'tracker-bar-completed'}`}>
          <div>
            <div className="tracker-bar-label">SHIPPED VIA</div>
            <div className="tracker-bar-value">
              {o.courier ? (COURIER_LABELS[o.courier] || o.courier) : '—'}
            </div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div className="tracker-bar-label">STATUS</div>
            <div className="tracker-bar-value">{o.status || 'In Production'}</div>
          </div>
          {o.factory_out && o.factory_out !== '0000-00-00' && o.factory_out !== '0000-00-00 00:00:00' && (
            <div style={{ textAlign:'right' }}>
              <div className="tracker-bar-label">EST. OUT</div>
              <div className="tracker-bar-value">{o.factory_out}</div>
            </div>
          )}
        </div>

        {/* Horizontal steps */}
        <div className="tracker-steps">
          {(() => {
            const visibleSteps = STEPS.slice(1)
            const displayStep = o.status === 'Pending' ? -1 : (o.status === 'In Production' ? 0 : o.status === 'Shipped' ? 1 : 2)

            return visibleSteps.map((step, i) => {
              const done   = i < displayStep
              const active = i === displayStep
              const isLast = i === visibleSteps.length - 1

              return (
                <div key={step.key} className="tracker-step-row">
                  {/* Circle + label */}
                  <div className="tracker-step">
                    <div className={`tracker-circle ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                      {done && <span>✓</span>}
                      {active && o.status !== 'Completed' && <span className="tracker-pulse" />}
                      {active && o.status === 'Completed' && <span>✓</span>}
                      {!done && !active && <span style={{ fontSize:16 }}>{step.icon}</span>}
                    </div>
                    <div className={`tracker-step-label ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                      {done ? `✓ ${step.label}` : step.label}
                    </div>
                  </div>

                  {/* Horizontal line between steps */}
                  {!isLast && (
                    <div className={`tracker-line ${done ? 'done' : ''}`} />
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>

      {/* ── Track button ── */}
      {hasTracking && (o.status === 'Shipped' || o.status === 'Completed') && (
        <button className="track-btn" onClick={openTracking}>
          📦 Track shipment ↗
        </button>
      )}

      {/* ── Submitted / Migrated date ── */}
      <div style={{ fontSize:11, color:'var(--muted)', paddingTop:4 }}>
        {o.submitted_by === 'import' ? '📂 Migrated' : '📝 Submitted'}:{' '}
        {o.created_at
          ? new Date(o.created_at).toLocaleString('en-MY', {
              day:'2-digit', month:'short', year:'numeric',
              hour:'2-digit', minute:'2-digit', hour12:true
            })
          : '—'}
      </div>

      {/* ── Invoice number ── */}
      {o.order_number && (
        <div className="order-number">
          Invoice # <strong>{o.order_number}</strong>
        </div>
      )}

      {/* ── Admin controls ── */}
      {isAdmin ? (
        <div className="foot">
          <select
            className="statussel"
            value={o.status || 'In Production'}
            onChange={e => onQuickStatus(o.id, e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="btn ghost sm" onClick={() => onManage(o.id)}>Manage</button>
        </div>
      ) : (
        <div className="foot">
          <span className="submitted">{o.submitted_by || ''}</span>
        </div>
      )}
    </div>
  )
}