const statusClass = {
  'Pending':       's-pending',
  'In Production': 's-production',
  'Shipped':       's-shipped',
  'Completed':     's-completed',
}

export default function StatusBadge({ status }) {
  const s = status || 'Pending'
  return (
    <span className={`badge ${statusClass[s] || 's-pending'}`}>{s}</span>
  )
}
