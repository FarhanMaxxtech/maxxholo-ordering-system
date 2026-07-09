export default function SkeletonCard(){
  return (
    <div className="skeleton-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{width:120,height:20,background:'#111',borderRadius:6}} />
        <div style={{width:60,height:20,background:'#111',borderRadius:6}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'8px 10px'}}>
        <div className="skeleton-line short" />
        <div className="skeleton-line full" />
        <div className="skeleton-line short" />
        <div className="skeleton-line medium" />
        <div className="skeleton-line short" />
        <div className="skeleton-line full" />
      </div>
      <div style={{height:40}} />
      <div style={{display:'flex',gap:8,marginTop:'auto'}}>
        <div style={{width:80,height:34,background:'#111',borderRadius:8}} />
        <div style={{width:80,height:34,background:'#111',borderRadius:8}} />
      </div>
    </div>
  )
}
