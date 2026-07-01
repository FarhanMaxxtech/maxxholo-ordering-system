import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Simple beep using Web Audio API — no external file needed
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g)
    g.connect(ctx.destination)
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.start(ctx.currentTime)
    o.stop(ctx.currentTime + 0.4)
  } catch (e) {
    // Browser blocked audio — ignore silently
  }
}

export default function Header({ me, onNewOrder, onLogout }) {
  const isAdmin = me.role === 'admin'

  const [notifications, setNotifications] = useState([])
  const [open,          setOpen]          = useState(false)
  const [unread,        setUnread]        = useState(0)
  const dropdownRef = useRef(null)

  // ── Load existing notifications on mount ──
  useEffect(() => {
    fetchNotifications()
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_email.eq.${me.email},user_email.is.null`)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) {
      setNotifications(data)
      setUnread(data.filter(n => !n.read).length)
    }
  }

  // ── Real-time listener for new notifications ──
  useEffect(() => {
    const channel = supabase
    .channel('notifications-channel')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        const newNotif = payload.new
        // ── Only show if targeted to this user or broadcast to all ──
        const isForMe = !newNotif.user_email || newNotif.user_email === me.email
        if (!isForMe) return
        setNotifications(prev => [newNotif, ...prev])
        setUnread(prev => prev + 1)
        playNotifSound()
      }
    )
    .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ── Close dropdown when clicking outside ──
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Mark all as read when opening dropdown ──
  async function toggleDropdown() {
    setOpen(prev => !prev)
    if (!open && unread > 0) {
      setUnread(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
    }
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins  < 1)  return 'just now'
    if (mins  < 60) return `${mins}m ago` 
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <header className="header">
      <div className="brand">
        <h1>Maxxholo Job Order System</h1>
        <span className="header-sub">hologram &amp; QR security labels</span>
      </div>

      <div style={{ fontSize:10, color:'var(--muted)', textAlign:'center', width:'100%', paddingTop:4 }}>
        Powered by Maxxtech Systems Sdn Bhd
      </div>

      <div className="headright">
        <span className={`rolechip ${isAdmin ? 'admin' : 'sales'}`}>
          {isAdmin ? 'ADMIN' : 'SALES'}
        </span>
        <span className="who">{me.email}</span>

        {/* ── Bell icon with badge ── */}
        <div className="notif-wrap" ref={dropdownRef}>
          <button className="notif-btn" onClick={toggleDropdown} title="Notifications">
            🔔
            {unread > 0 && (
              <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>
            )}
          </button>

          {/* ── Dropdown ── */}
          {open && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications</span>
                <span className="notif-count">{notifications.length}</span>
              </div>

              {notifications.length === 0 ? (
                <div className="notif-empty">No notifications yet</div>
              ) : (
                <div className="notif-list">
                  {notifications.map(n => (
                    <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                      <div className="notif-msg">{n.message}</div>
                      <div className="notif-time">{timeAgo(n.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!isAdmin && (
          <button className="btn ghost sm" onClick={onNewOrder}>
            + New Job Order
          </button>
        )}
        <button className="btn ghost sm" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}