import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { supabaseAdmin as adminClient } from '../lib/supabaseAdmin'

// ── Admin client using service_role key ──
// This bypasses RLS and can create/manage auth users
export default function UsersPage() {
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    const { data, error } = await adminClient.auth.admin.listUsers()
    if (error) {
      setError(error.message)
    } else {
      // Map auth users into a clean list
      const list = (data.users || []).map(u => ({
        id:        u.id,
        email:     u.email,
        username:  u.user_metadata?.username || '—',
        full_name: u.user_metadata?.full_name || '—',
        role:      u.user_metadata?.role || 'sales',
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        banned:    !!u.banned_until,
      }))
      setUsers(list)
    }
    setLoading(false)
  }

  function openCreate() {
    setEditUser(null)
    setFormOpen(true)
  }

  function openEdit(user) {
    setEditUser(user)
    setFormOpen(true)
  }

  return (
    <>
      <div className="note">
        Admin only — manage all system users here. Create sales accounts and set their roles.
      </div>

      <div className="toolbar">
        <div className="spacer" />
        <button className="btn sm" onClick={openCreate}>+ Add User</button>
        <button className="btn ghost sm" onClick={loadUsers}>↻ Refresh</button>
      </div>

      {error && <div className="login-err">{error}</div>}

      {loading ? (
        <div className="empty">Loading users…</div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign:'center', color:'var(--muted)', padding:40 }}>
                    No users found.
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>@{u.username}</strong></td>
                  <td>{u.full_name}</td>
                  <td style={{ color:'var(--muted)', fontSize:12 }}>{u.email}</td>
                  <td>
                    <span className={`rolechip ${u.role === 'admin' ? 'admin' : 'sales'}`}
                      style={{ fontSize:10, padding:'2px 8px' }}>
                      {u.role?.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize:11, color:'var(--muted)' }}>
                    {u.last_sign_in
                      ? new Date(u.last_sign_in).toLocaleString()
                      : 'Never'}
                  </td>
                  <td>
                    <span style={{
                      fontSize:11, fontWeight:600,
                      color: u.banned ? 'var(--red)' : 'var(--green)'
                    }}>
                      {u.banned ? '● Banned' : '● Active'}
                    </span>
                  </td>
                  <td>
                    <button className="btn ghost sm" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <UserForm
          user={editUser}
          onClose={() => setFormOpen(false)}
          onDone={() => { setFormOpen(false); loadUsers() }}
        />
      )}
    </>
  )
}

// ── Create / Edit User Form ──
function UserForm({ user, onClose, onDone }) {
  const isEdit = !!user

  const [username,  setUsername]  = useState(user?.username  || '')
  const [fullName,  setFullName]  = useState(user?.full_name || '')
  const [email,     setEmail]     = useState(user?.email     || '')
  const [role,      setRole]      = useState(user?.role      || 'sales')
  const [password,  setPassword]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  async function handleSave() {
    setError('')
    if (!username.trim()) { setError('Username is required.'); return }
    if (!email.trim())    { setError('Email is required.'); return }
    if (!isEdit && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setSaving(true)
    try {
      if (!isEdit) {
        // ── Create new user ──
        const { error } = await adminClient.auth.admin.createUser({
          email:            email.trim(),
          password:         password,
          email_confirm:    true,
          user_metadata: {
            username:   username.trim().toLowerCase(),
            full_name:  fullName.trim(),
            role:       role,
          },
        })
        if (error) throw new Error(error.message)
      } else {
        // ── Update existing user ──
        const updates = {
          user_metadata: {
            username:   username.trim().toLowerCase(),
            full_name:  fullName.trim(),
            role:       role,
          },
        }
        if (password.length >= 6) {
          updates.password = password
        }
        const { error } = await adminClient.auth.admin.updateUserById(
          user.id,
          updates
        )
        if (error) throw new Error(error.message)
      }
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleBan() {
    if (!confirm(`${user.banned ? 'Unban' : 'Ban'} this user?`)) return
    setSaving(true)
    try {
      const { error } = await adminClient.auth.admin.updateUserById(user.id, {
        ban_duration: user.banned ? 'none' : '876600h', // ban for 100 years
      })
      if (error) throw new Error(error.message)
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Permanently delete this user? This cannot be undone.')) return
    setSaving(true)
    try {
      const { error } = await adminClient.auth.admin.deleteUser(user.id)
      if (error) throw new Error(error.message)
      onDone()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-bg show">
      <div className="modal">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ margin:0 }}>{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button className="btn ghost sm" onClick={onClose}>Close</button>
        </div>

        <div className="hint">
          {isEdit
            ? 'Update user details. Leave password blank to keep existing password.'
            : 'Create a new user. They can log in immediately after creation.'}
        </div>

        <div className="grid2">
          <div className="field">
            <label>Username <span className="req">*</span></label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))}
              placeholder="e.g. yana"
            />
          </div>
          <div className="field">
            <label>Full Name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Yana Ahmad"
            />
          </div>
        </div>

        <div className="grid2">
          <div className="field">
            <label>Email <span className="req">*</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. yana@maxxholo.com"
              disabled={isEdit}
            />
          </div>
          <div className="field">
            <label>Role <span className="req">*</span></label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="sales">Sales</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
          />
        </div>

        {error && <div className="login-err">{error}</div>}

        <div className="modal-foot">
          {isEdit && (
            <>
              <button className="btn danger" onClick={handleBan} disabled={saving}>
                {user.banned ? 'Unban User' : 'Ban User'}
              </button>
              <button className="btn danger" onClick={handleDelete} disabled={saving}
                style={{ marginRight:'auto' }}>
                Delete
              </button>
            </>
          )}
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}