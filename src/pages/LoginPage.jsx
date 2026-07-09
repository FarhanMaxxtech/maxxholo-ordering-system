import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/maxxholo1.jpg'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    // ── Aggressively clear any cached session on login page load ──
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        // Still has session — sign out completely and reload clean
        await supabase.auth.signOut()
        localStorage.clear()
        sessionStorage.clear()
      }
      setLoading(false)
    }
    init()
  }, [])

  async function doLogin() {
    setError('')
    if (!username.trim()) { setError('Enter your username.'); return }

    setLoading(true)
    try {
      const normalizedUsername = username.trim().toLowerCase()
      const { data: account, error: accountErr } = await supabase
        .from('app_accounts')
        .select('email, username')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (accountErr) {
        setError('Lookup failed: ' + accountErr.message)
        return
      }
      if (!account?.email) {
        setError('Unknown username.')
        return
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      })
      if (signInErr) {
        setError('Wrong username or password.')
        return
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{
      position:'fixed', inset:0, background:'var(--bg)',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'var(--muted)', fontSize:14
    }}>
      Checking session…
    </div>
  )

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-brand-top">
          <img src={logo} alt="Maxxholo logo" className="login-brand-image" />
        </div>
        <h2>Job Order System</h2>
        <div className="sub">Sign in with your username and password</div>

        <div className="field">
          <label>Username</label>
          <input
            type="text"
            placeholder="e.g. yana"
            autoComplete="username"
            autoCapitalize="off"
            spellCheck="false"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doLogin()}
          />
        </div>

        <button className="btn" onClick={doLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {error && <div className="login-err">{error}</div>}
      </div>
    </div>
  )
}
