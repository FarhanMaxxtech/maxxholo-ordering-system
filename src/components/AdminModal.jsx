import { useState, useEffect } from 'react'

const STATUSES = ['Pending', 'In Production', 'Shipped', 'Completed']

const COURIERS = [
  { value: '',      label: '— Select courier —' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'gdex',  label: 'GDEX' },
  { value: 'other', label: 'Others' },
]

export default function AdminModal({ order: o, onSave, onDelete, onClose }) {
  const [status,         setStatus]        = useState('Pending')
  const [factoryOut,     setFactoryOut]     = useState('')
  const [adminNote,      setAdminNote]      = useState('')
  const [courier,        setCourier]        = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [copied,         setCopied]         = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')

  useEffect(() => {
    if (o) {
      setStatus(o.status                  || 'Pending')
      setFactoryOut(o.factory_out         || '')
      setAdminNote(o.admin_note           || '')
      setCourier(o.courier                || '')
      setTrackingNumber(o.tracking_number || '')
    }
  }, [o])

  if (!o) return null

  function handleCopy() {
    navigator.clipboard.writeText(trackingNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShare() {
    const text = `Tracking ID: ${trackingNumber}\nCourier: ${COURIERS.find(c => c.value === courier)?.label || courier}`
    if (navigator.share) {
      navigator.share({ title: 'Maxxholo Tracking', text })
    } else {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await onSave(o.id, {
        status,
        factory_out:     factoryOut     || null,
        admin_note:      adminNote,
        courier:         courier        || null,
        tracking_number: trackingNumber || null,
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this order permanently?')) return
    try {
      await onDelete(o.id)
      onClose()
    } catch (e) {
      setError(e.message)
    }
  }

  function row(label, val) {
    if (!val) return null
    return (
      <div className="detail-row" key={label}>
        <span className="k">{label}</span>
        <span className="v">{val}</span>
      </div>
    )
  }

  const isShipped = status === 'Shipped' || status === 'Completed'

  return (
    <div className="modal-bg show">
      <div className="modal">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ margin:0 }}>{o.brand}</h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>

        <div className="hint">{o.company} · {o.product} · Qty {o.qty}</div>

        {/* ── Invoice number ── */}
        {o.order_number && (
          <div className="order-number-badge">
            Invoice # <strong>{o.order_number}</strong>
          </div>
        )}

        {/* ── Order details read-only ── */}
        <div>
          {row('Sales PIC',   o.pic)}
          {row('Order Type',  o.order_type)}
          {row('Colour',      o.colour)}
          {row('Serial',      o.serial)}
          {row('Domain',      o.domain)}
          {row('Wowcheck2u',  o.wowcheck2u)}
          {o.ref_link && (
            <div className="detail-row">
              <span className="k">Reference</span>
              <span className="v">
                <a href={o.ref_link} target="_blank" rel="noreferrer">Open link</a>
              </span>
            </div>
          )}
          {row('Remark', o.remark)}

          {/* ── Submitted info ── */}
          <div className="detail-row">
            <span className="k">Submitted by</span>
            <span className="v">{o.submitted_by || '—'}</span>
          </div>
          <div className="detail-row">
            <span className="k">Submitted on</span>
            <span className="v">
              {o.created_at
                ? new Date(o.created_at).toLocaleString('en-MY', {
                    day:    '2-digit',
                    month:  'short',
                    year:   'numeric',
                    hour:   '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : '—'}
            </span>
          </div>
          {o.updated_at && o.updated_at !== o.created_at && (
            <div className="detail-row">
              <span className="k">Last updated</span>
              <span className="v">
                {new Date(o.updated_at).toLocaleString('en-MY', {
                  day:    '2-digit',
                  month:  'short',
                  year:   'numeric',
                  hour:   '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </span>
            </div>
          )}
        </div>

        {/* ── Status + Factory out ── */}
        <div className="grid2" style={{ marginTop:14 }}>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Est. Out from Factory</label>
            <input
              type="date"
              value={factoryOut}
              onChange={e => setFactoryOut(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Admin Note</label>
          <textarea
            value={adminNote}
            onChange={e => setAdminNote(e.target.value)}
            placeholder="Internal note (production, courier, delays...)"
          />
        </div>

        {/* ── Shipping section — only show when Shipped or Completed ── */}
        {isShipped && (
          <div className="shipping-section">
            <div className="shipping-title">📦 Shipping &amp; Tracking</div>

            <div className="field">
              <label>Courier</label>
              <select value={courier} onChange={e => setCourier(e.target.value)}>
                {COURIERS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Tracking Number</label>
              <input
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value)}
                placeholder="Paste tracking number from courier"
              />
            </div>
          </div>
        )}

        {error && <div className="login-err">{error}</div>}

        <div className="modal-foot">
          <button className="btn danger" onClick={handleDelete}>Delete order</button>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}