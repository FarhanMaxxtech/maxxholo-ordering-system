import StatusBadge from './StatusBadge'

const STATUSES = ['In Production', 'Shipped', 'Completed']

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
  { key: 'In Production', label: 'In Production', icon: '🏭' },
  { key: 'Shipped',       label: 'Shipped',       icon: '⏳' },
  { key: 'Completed',     label: 'Completed',     icon: '⏳' },
]

function getStepIndex(status) {
  const i = STEPS.findIndex(s => s.key === status)
  return i === -1 ? 0 : i
}

export default function OrderCard({ order: o, isAdmin, onQuickStatus, onManage }) {
  const hasTracking = o.tracking_number && o.courier
  const currentStep = getStepIndex(o.status)

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

      {/* ── Details ── */}
      <div className="meta">
        <b>Product</b><span>{o.product}</span>
        <b>Qty</b><span>{o.qty}{o.colour ? ` · ${o.colour}` : ''}</span>
        <b>Sales</b><span>{o.pic}</span>
        {o.serial      && <><b>Serial</b><span>{o.serial}</span></>}
        {o.factory_out && <><b>Factory out</b><span>{o.factory_out}</span></>}
        {hasTracking && (
          <>
            <b>Courier</b>
            <span>{COURIER_LABELS[o.courier] || o.courier}</span>
            <b>Tracking</b>
            <span style={{ fontFamily:'monospace', fontSize:11 }}>{o.tracking_number}</span>
          </>
        )}
      </div>

      {/* ── Horizontal Progress Tracker ── */}
      <div className="tracker-wrap">
        {/* Info bar */}
        <div className="tracker-bar">
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
          {o.factory_out && (
            <div style={{ textAlign:'right' }}>
              <div className="tracker-bar-label">EST. OUT</div>
              <div className="tracker-bar-value">{o.factory_out}</div>
            </div>
          )}
        </div>

        {/* Horizontal steps */}
        <div className="tracker-steps">
          {STEPS.map((step, i) => {
            const done   = i < currentStep
            const active = i === currentStep
            const isLast = i === STEPS.length - 1

            return (
              <div key={step.key} className="tracker-step-row">
                {/* Circle + label */}
                <div className="tracker-step">
                  <div className={`tracker-circle ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                    {done                                    && <span>✓</span>}
                      {active && o.status !== 'Completed'      && <span className="tracker-pulse" />}
                      {active && o.status === 'Completed'      && <span>✓</span>}
                      {!done && !active                        && <span style={{ fontSize:16 }}>{step.icon}</span>}
                  </div>
                  <div className={`tracker-step-label ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                    {done && '✓ '}{step.label}
                  </div>
                </div>

                {/* Horizontal line between steps */}
                {!isLast && (
                  <div className={`tracker-line ${done ? 'done' : ''}`} />
                )}
              </div>
            )
          })}
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