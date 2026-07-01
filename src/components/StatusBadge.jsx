const statusClass = {
  'In Production': 's-production',
  'Shipped':       's-shipped',
  'Completed':     's-completed',
}

export default function StatusBadge({ status }) {
  const s = status || 'In Production'
  return (
    <span className={`badge ${statusClass[s] || 's-production'}`}>{s}</span>
  )
}
