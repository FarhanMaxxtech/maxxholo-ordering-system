import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'


// ── Convert Excel serial date number to YYYY-MM-DD ──
function excelDateToISO(val) {
  if (!val) return null
  const s = String(val).trim()

  // Skip non-date values
  const skip = /^(MY|JT|TH|SG|FD|UPS|DHL|POS)[A-Z0-9]+/i
  const courierNames = /^(fedex|skynet|gdex|dhl|ups|ninja|jnt|j&t|pos malaysia|sea)/i
  if (skip.test(s) || courierNames.test(s)) return null

  // Excel serial number e.g. 45344
  if (/^\d{5}$/.test(s)) {
    const date = new Date(Math.round((parseFloat(s) - 25569) * 86400 * 1000))
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]
    return null
  }

  // "26th July" style
  if (/\d+(st|nd|rd|th)/i.test(s)) return null

  // DD/MM/YYYY or DD/MM/YY
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (dmy) {
    let [, d, m, y] = dmy
    if (y.length === 2) y = '20' + y
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`)
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]
    return null
  }

  // Try generic parse
  try {
    const date = new Date(s)
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
      return date.toISOString().split('T')[0]
    }
  } catch { /* ignore */ }

  return null
}

function mapRow(row, index, submittedBy) {
  const clean = (val) => {
    if (val === null || val === undefined) return null
    const s = String(val).trim()
    if (['', '-', 'nan', 'none', '.', 'n/a'].includes(s.toLowerCase())) return null
    return s
  }

  // Pick first non-null from two columns
  const pick = (a, b) => clean(b) || clean(a) || null

  // Get all possible column name variants
  const keys = Object.keys(row)

  const getCol = (...names) => {
    for (const n of names) {
      const key = keys.find(k => k.trim().toLowerCase().startsWith(n.toLowerCase()))
      if (key && clean(row[key])) return clean(row[key])
    }
    return null
  }

  const brand = pick(
    row['LOGO/BRAND/HOLOGRAM Name'],
    row['LOGO/BRAND/HOLOGRAM Name_1']
  ) || getCol('LOGO', 'BRAND') || '—'

  const company = pick(
    row['Company Name'],
    row['Company Name_1']
  ) || getCol('Company') || '—'

  const product = pick(
    row['Order product'],
    row['Order product_1']
  ) || getCol('Order product') || 'Others'

  // qty — must be a number, fallback to '0'
  const qtyRaw = pick(row['Order Quantity'], row['Order Quantity '])
  const qtyMatch = qtyRaw ? String(qtyRaw).replace(/,/g, '').match(/\d+/) : null
  const qty = qtyMatch ? qtyMatch[0] : '0'

  const serial = pick(
    row['Serial Number\nExample: Format 10,000, 00001-11000 (Variable QR +10%)'],
    row['Serial Number\nExample: Format 10,000, 00001-11000 (Variable QR +10%)_1']
  )

  const remark = pick(row['Remark'], row['Remark_1'])
  const ref    = pick(row['Image/File upload for REF'], row['Image/File upload for REF_1'])

  const wowRaw = pick(row['Wowcheck2u (Yes/No)'], row['Wowcheck2u (Yes/No)_1'])
  const wow = wowRaw
    ? (['yes','y'].includes(wowRaw.toLowerCase()) ? 'Yes' : 'No')
    : null

  // factory_out — convert all date formats, drop anything invalid
  const foRaw = getCol('Estimate Out')
  const factory_out = excelDateToISO(foRaw)

  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')

  return {
    order_number: `INV-${dateStr}-${String(index + 1).padStart(3, '0')}`,
    pic:          clean(row['Sales PIC Name']) || '—',
    order_type:   clean(row['ORDER TYPE']) || 'NEW ORDER',
    brand,
    company,
    product,
    qty,
    serial,
    domain:       clean(row['Domain Name']),
    wowcheck2u:   wow,
    colour:       clean(row['Hologram Colour']),
    remark,
    ref_link:     ref,
    factory_out,  // null if invalid — Supabase accepts null for date columns
    status:       'Completed',
    submitted_by: submittedBy || 'import',
  }
}

export default function ImportModal({ onClose, onDone, submittedBy }) {
  const [rows,     setRows]     = useState([])
  const [fileName, setFileName] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    setError('')
    setDone(false)
    setRows([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary', cellDates: false })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws, { defval: null, raw: true })

        const mapped = data
        .map((row, i) => mapRow(row, i, submittedBy))
          .filter(r => r.brand !== '—' || r.company !== '—') // skip totally empty rows

        setRows(mapped)
      } catch (err) {
        setError('Could not read file: ' + err.message)
      }
    }
    reader.readAsBinaryString(file)
  }

  async function handleImport() {
    setLoading(true)
    setError('')
    setProgress(0)

    const BATCH = 20
    let imported = 0

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      const { error } = await supabase.from('orders').insert(batch)
      if (error) {
        console.error('Supabase error:', JSON.stringify(error))
        setError(`Import failed at row ${i + 1}: ${error.message}`)
        setLoading(false)
        return
      }
      imported += batch.length
      setProgress(Math.round((imported / rows.length) * 100))
    }

    setLoading(false)
    setDone(true)
    onDone?.()
  }

  return (
    <div className="modal-bg show">
      <div className="modal">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ margin:0 }}>📥 Import Orders from Excel</h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>

        <div className="hint">
          Upload your Excel file (.xlsx) — orders will be imported automatically.
        </div>

        {/* File picker */}
        {!done && (
          <div className="import-drop">
            <input
              type="file"
              accept=".xlsx,.xls"
              id="excel-upload"
              style={{ display:'none' }}
              onChange={handleFile}
            />
            <label htmlFor="excel-upload" className="import-drop-label">
              <div className="import-drop-icon">📂</div>
              <div>{fileName || 'Click to choose Excel file'}</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                .xlsx or .xls supported
              </div>
            </label>
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !done && (
          <>
            <div className="import-preview-header">
              <span>✓ {rows.length} orders found</span>
              <span style={{ color:'var(--muted)', fontSize:11 }}>Preview (first 5)</span>
            </div>
            <div className="import-table-wrap">
              <table className="import-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Invoice</th>
                    <th>Brand</th>
                    <th>Company</th>
                    <th>Qty</th>
                    <th>Sales PIC</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td style={{ fontFamily:'monospace', fontSize:11 }}>{r.order_number}</td>
                      <td>{r.brand}</td>
                      <td>{r.company}</td>
                      <td>{r.qty}</td>
                      <td>{r.pic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 5 && (
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6, textAlign:'center' }}>
                + {rows.length - 5} more orders
              </div>
            )}
          </>
        )}

        {/* Progress */}
        {loading && (
          <div className="import-progress-wrap">
            <div className="import-progress-label">Importing… {progress}%</div>
            <div className="import-progress-bar">
              <div className="import-progress-fill" style={{ width:`${progress}%` }} />
            </div>
          </div>
        )}

        {/* Success */}
        {done && (
          <div className="import-success">
            <div style={{ fontSize:32 }}>✅</div>
            <div style={{ fontWeight:600, marginTop:8 }}>Import Complete!</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
              {rows.length} orders added to the system.
            </div>
            <button className="btn" style={{ marginTop:14 }} onClick={onClose}>Done</button>
          </div>
        )}

        {error && <div className="login-err" style={{ marginTop:10 }}>{error}</div>}

        {!done && (
          <div className="modal-foot">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button
              className="btn"
              onClick={handleImport}
              disabled={rows.length === 0 || loading}
            >
              {loading ? `Importing… ${progress}%` : `Import ${rows.length} Orders`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}