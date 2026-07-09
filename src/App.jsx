import { useState, useEffect, useRef } from 'react'
import { supabase }      from './lib/supabase'
import LoginPage         from './pages/LoginPage'
import OrdersPage        from './pages/OrdersPage'
import DashboardPage     from './pages/DashboardPage'
import UsersPage         from './pages/UsersPage'
import Header            from './components/Header'

export default function App() {
  const [session,    setSession]    = useState(null)
  const [me,         setMe]         = useState({ email: '', role: 'sales' })
  const [activeTab,  setActiveTab]  = useState('orders')
  const [authReady,  setAuthReady]  = useState(false)
  const [theme,      setTheme]      = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('maxxholo-theme') || 'dark'
    }
    return 'dark'
  })
  const [formOpen,   setFormOpen]   = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode,   setViewMode]   = useState('orders')
  const sessionRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('maxxholo-theme', theme)
  }, [theme])

  // ── refs to call OrdersPage functions from App ──
  const refreshRef  = useRef(null)
  const exportRef   = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        applySession(data.session)
        sessionRef.current = data.session
      }
      setAuthReady(true)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      sessionRef.current = session
      if (session) {
        applySession(session)
      } else {
        setSession(null)
        setMe({ email: '', role: 'sales' })
        setActiveTab('orders')
      }
    })

    const handlePageShow = async (e) => {
      if (e.persisted) {
        const { data } = await supabase.auth.getSession()
        if (!data.session) window.location.reload()
      }
    }

    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await supabase.auth.getSession()
        if (!data.session && sessionRef.current) window.location.reload()
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    window.history.pushState(null, '', window.location.href)
    const blockBack = () => window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', blockBack)
    return () => window.removeEventListener('popstate', blockBack)
  }, [session])

  function applySession(session) {
    setSession(session)
    sessionRef.current = session
    setMe({
      email: session.user.email,
      role:  session.user.user_metadata?.role || 'sales',
    })
  }

  async function doLogout() {
    sessionRef.current = null
    await supabase.auth.signOut()
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = window.location.origin +
      window.location.pathname + '?nocache=' + Date.now()
  }

  if (!authReady) return null
  if (!session)   return <LoginPage />

  const isAdmin = me.role === 'admin'

  const tabs = [
    { key: 'orders',    label: 'Orders' },
    { key: 'dashboard', label: 'Dashboard' },
    ...(isAdmin ? [{ key: 'users', label: '👥 Users' }] : []),
    { key: 'history',   label: 'History' },
  ]

  return (
    <div style={{ width:'100%', maxWidth:'100%', overflowX:'hidden' }}>
      <Header
        me={me}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onNewOrder={() => {
          setActiveTab('orders')
          setFormOpen(true)
        }}
        onLogout={doLogout}
      />

      <div className="wrap">
        {/* ── Tabs row with action buttons ── */}
        <div className="tabs-row">
          <div className="tabs">
            {tabs.map(t => (
              <div
                key={t.key}
                className={`tab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(t.key)
                  if (t.key === 'history') {
                    setViewMode('history')
                  } else if (t.key === 'orders') {
                    setViewMode('orders')
                  }
                }}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        {(activeTab === 'orders' || activeTab === 'history') && (
          <OrdersPage
            me={me}
            externalFormOpen={formOpen}
            externalImportOpen={importOpen}
            onExternalFormClose={() => setFormOpen(false)}
            onExternalImportClose={() => setImportOpen(false)}
            onRegisterRefresh={(fn) => { refreshRef.current = fn }}
            onRegisterExport={(fn)  => { exportRef.current  = fn }}
            viewMode={viewMode}
          />
        )}
        {activeTab === 'dashboard' && <DashboardPage />}
        {activeTab === 'users'     && isAdmin && <UsersPage />}
      </div>

      <footer style={{
        textAlign:'center', padding:'16px',
        fontSize:11, color:'var(--muted)',
        borderTop:'1px solid var(--line)', marginTop:40,
      }}>
        Powered by Maxxtech Systems Sdn Bhd
      </footer>
    </div>
  )
}
