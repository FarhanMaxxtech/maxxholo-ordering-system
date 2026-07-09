import { useState, useEffect } from 'react'
import { useOrders }   from '../hooks/useOrders'
import OrderCard       from '../components/OrderCard'
import OrderForm       from '../components/OrderForm'
import AdminModal      from '../components/AdminModal'
import ImportModal     from '../components/ImportModal'
import SkeletonCard    from '../components/SkeletonCard'

export default function OrdersPage({
  me,
  externalFormOpen,
  externalImportOpen,
  onExternalFormClose,
  onExternalImportClose,
  onRegisterRefresh,
  onRegisterExport,
  viewMode,
}) {
  const isAdmin = me.role === 'admin'

  const { orders, loading, loadOrders, saveOrder, updateStatus, saveAdmin, deleteOrder } = useOrders()

  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [formOpen,     setFormOpen]     = useState(false)
  const [editOrder,    setEditOrder]    = useState(null)
  const [adminOpen,    setAdminOpen]    = useState(false)
  const [adminOrder,   setAdminOrder]   = useState(null)
  const [importOpen,   setImportOpen]   = useState(false)

  // ── Register refresh + export handlers with App ──
  useEffect(() => {
    onRegisterRefresh?.(() => loadOrders())
    onRegisterExport?.(() => exportCSV())
  }, [orders])

  // ── Handle external form open (from Header + New Order button) ──
  useEffect(() => {
    if (externalFormOpen) {
      setEditOrder(null)
      setFormOpen(true)
    }
  }, [externalFormOpen])

  // ── Handle external import open (from tab action button) ──
  useEffect(() => {
    if (externalImportOpen) setImportOpen(true)
  }, [externalImportOpen])

  // ── Clear status filter when switching to History, since completed is not available there ──
  useEffect(() => {
    if (viewMode === 'history') setFilterStatus('')
  }, [viewMode])

  function handleFormClose() {
    setFormOpen(false)
    onExternalFormClose?.()
  }

  function handleImportClose() {
    setImportOpen(false)
    onExternalImportClose?.()
  }

  // ── Filter + sort ──
  // Always sort by submitted date (created_at) newest first, regardless of status
  const sortedOrders = [...orders].sort((a, b) => {
    const aDate = new Date(a.created_at || 0).getTime()
    const bDate = new Date(b.created_at || 0).getTime()
    return bDate - aDate
  })

  const filtered = sortedOrders.filter(o => {
    const blob = [o.pic, o.brand, o.company, o.serial, o.product, o.domain]
      .join(' ').toLowerCase()

    const matchQ = !search       || blob.includes(search.toLowerCase())
    const matchS = !filterStatus || o.status     === filterStatus

    const matchView = viewMode === 'history'
      ? o.status === 'Completed'
      : ['Pending','In Production','Shipped'].includes(o.status)

    return matchQ && matchS && matchView
  })

  async function handleSaveOrder(formData, id) {
    await saveOrder(formData, id, me.email)
  }

  function openAdmin(id) {
    const o = orders.find(x => x.id === id)
    if (!o) return
    setAdminOrder(o)
    setAdminOpen(true)
  }

  function exportCSV() {
    const cols = ['order_number','brand','company','pic','order_type','product','qty',
      'colour','serial','domain','wowcheck2u','status','factory_out','courier',
      'tracking_number','admin_note','remark','ref_link','created_at']
    const head = ['Invoice#','Brand','Company','Sales PIC','Type','Product','Qty',
      'Colour','Serial','Domain','Wowcheck2u','Status','FactoryOut','Courier',
      'Tracking','AdminNote','Remark','Reference','Submitted']
    const rows = orders.map(o =>
      cols.map(c => `"${String(o[c] || '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [head.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'maxxholo-orders.csv'
    a.click()
  }

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search brand, company, sales PIC, serial..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          disabled={viewMode === 'history'}
          title={viewMode === 'history' ? 'Status filter is disabled in History view' : ''}
        >
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>In Production</option>
          <option>Shipped</option>
        </select>
      </div>

      {/* ── Cards ── */}
      <div className="cards">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {!loading && filtered.length === 0 && (
          <div className="empty">
            <div style={{marginBottom:12}}>No orders found.</div>
            {!isAdmin && (
              <button className="btn" onClick={() => { setEditOrder(null); setFormOpen(true) }}>+ New Job Order</button>
            )}
          </div>
        )}
        {!loading && filtered.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            isAdmin={isAdmin}
            onQuickStatus={updateStatus}
            onManage={openAdmin}
          />
        ))}
      </div>

      {/* ── Modals ── */}
      {formOpen && (
        <OrderForm
          order={editOrder}
          onSave={handleSaveOrder}
          onClose={handleFormClose}
        />
      )}
      {adminOpen && (
        <AdminModal
          order={adminOrder}
          onSave={saveAdmin}
          onDelete={deleteOrder}
          onClose={() => setAdminOpen(false)}
        />
      )}
      {importOpen && (
        <ImportModal
          submittedBy={me.email}
          onClose={handleImportClose}
          onDone={() => { handleImportClose(); loadOrders() }}
        />
      )}
    </>
  )
}
