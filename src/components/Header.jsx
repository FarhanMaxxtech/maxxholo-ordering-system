import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/maxxholo1.jpg'

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

export default function Header({ me, theme, onToggleTheme, onNewOrder, onLogout }) {
  const isAdmin = me.role === 'admin'

  const [notifications, setNotifications] = useState([])
  const [open,          setOpen]          = useState(false)
  const [unread,        setUnread]        = useState(0)
  const dropdownRef = useRef(null)

  async function fetchNotifications() {
    if (!me?.email) return
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

  // ── Load existing notifications when the signed-in user changes ──
  useEffect(() => {
    fetchNotifications()
  }, [me?.email])

  // ── Refresh notifications after an order save or other update event ──
  useEffect(() => {
    if (!me?.email) return

    const handleRefresh = () => fetchNotifications()
    window.addEventListener('maxxholo:notifications-updated', handleRefresh)
    return () => window.removeEventListener('maxxholo:notifications-updated', handleRefresh)
  }, [me?.email])

  // ── Real-time listener for new notifications ──
  useEffect(() => {
    if (!me?.email) return

    const channel = supabase
      .channel(`notifications-channel-${me.email}`)
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
  }, [me?.email])

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
      <div className="brand" style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div className="logochip">
          <img src={logo} alt="Maxxholo logo" style={{ height: 20, width: 'auto' }} />
        </div>
        <div style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>
          Job Order System
        </div>
      </div>

      <div style={{ fontSize:15, color:'var(--muted)', textAlign:'center', width:'100%', paddingTop:4 }}>
        Maxxtech
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

        <button className="btn ghost sm theme-toggle" onClick={onToggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        {!isAdmin && (
          <button className="btn ghost sm inline" onClick={onNewOrder}>
            + Job
          </button>
        )}
        <button className="btn ghost sm inline" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}