import { useState, useEffect } from 'react'

const EMPTY = {
  pic: '', order_type: 'NEW ORDER', brand: '', company: '',
  product: 'Hologram with QR code', qty: '', colour: '',
  serial: '', domain: '', wowcheck2u: '', ref_link: '', remark: '',
}

export default function OrderForm({ order, onSave, onClose }) {
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (order) {
      setForm({
        pic:        order.pic        || '',
        order_type: order.order_type || 'NEW ORDER',
        brand:      order.brand      || '',
        company:    order.company    || '',
        product:    order.product    || 'Hologram with QR code',
        qty:        order.qty        || '',
        colour:     order.colour     || '',
        serial:     order.serial     || '',
        domain:     order.domain     || '',
        wowcheck2u: order.wowcheck2u || '',
        ref_link:   order.ref_link   || '',
        remark:     order.remark     || '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [order])

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setError('')
    if (!form.pic || !form.brand || !form.company || !form.qty) {
      setError('Please fill all required (*) fields.')
      return
    }
    setSaving(true)
    try {
      await onSave(form, order?.id)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-bg show">
      <div className="modal">
        <h2>{order ? 'Edit Job Order' : 'New Job Order'}</h2>
        <div className="hint">
          Fields marked <span style={{ color: 'var(--red)' }}>*</span> are required.
          An order number will be automatically generated upon submission.
        </div>

        <div className="grid2">
          <div className="field">
            <label>Sales PIC <span className="req">*</span></label>
            <input value={form.pic} onChange={e => set('pic', e.target.value)} placeholder="e.g. Yana, Kimi" />
          </div>
          <div className="field">
            <label>Order Type <span className="req">*</span></label>
            <select value={form.order_type} onChange={e => set('order_type', e.target.value)}>
              <option value="NEW ORDER">New Order</option>
              <option value="REPEAT ORDER">Repeat Order</option>
            </select>
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Logo / Brand / Hologram Name <span className="req">*</span></label>
            <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="e.g. Labrich" />
          </div>
          <div className="field">
            <label>Company Name <span className="req">*</span></label>
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. SM Rich Global Sdn Bhd" />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Order Product <span className="req">*</span></label>
            <select value={form.product} onChange={e => set('product', e.target.value)}>
              <option>Hologram with QR code</option>
              <option>Hologram only</option>
              <option>Hologram Foil Printing &amp; QR code</option>
              <option>Tamper Evident</option>
              <option>Variable QR</option>
              <option>Others</option>
            </select>
          </div>
          <div className="field">
            <label>Order Quantity <span className="req">*</span></label>
            <input value={form.qty} onChange={e => set('qty', e.target.value)} placeholder="e.g. 100000" />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Hologram Colour</label>
            <select value={form.colour} onChange={e => set('colour', e.target.value)}>
              <option value="">—</option>
              <option>GOLD</option>
              <option>SILVER</option>
              <option>ROSE GOLD</option>
              <option>OTHERS</option>
            </select>
          </div>
          <div className="field">
            <label>Serial Number</label>
            <input value={form.serial} onChange={e => set('serial', e.target.value)} placeholder="e.g. 00001-11000" />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Domain Name</label>
            <input value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="e.g. labrich.my" />
          </div>
          <div className="field">
            <label>Wowcheck2u</label>
            <select value={form.wowcheck2u} onChange={e => set('wowcheck2u', e.target.value)}>
              <option value="">—</option>
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Reference File / Image (link)</label>
          <input value={form.ref_link} onChange={e => set('ref_link', e.target.value)} placeholder="Google Drive link" />
        </div>

        <div className="field">
          <label>Remark</label>
          <textarea value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="Notes, special instructions, courier..." />
        </div>

        {error && <div className="login-err">{error}</div>}

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : order ? 'Save changes' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
