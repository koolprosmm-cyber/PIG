'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) { setError('Incorrect password.'); return }
      router.push('/admin')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '36px 32px' }}>
          <h2 style={{ color: 'var(--signal-teal)', fontWeight: 800, margin: '0 0 6px', fontSize: '1.3rem' }}>Admin Access</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', margin: '0 0 24px' }}>PIG³ Admin Panel</p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--surface-raised)', border: '1px solid var(--border)',
                color: 'var(--ink)', borderRadius: 8, padding: '11px 14px',
                fontSize: '0.95rem', outline: 'none', marginBottom: 14,
              }}
            />
            {error && <p style={{ color: 'var(--bad, #e2645a)', fontSize: '0.85rem', margin: '0 0 12px' }}>{error}</p>}
            <button type="submit" disabled={loading || !password} style={{
              width: '100%', background: loading || !password ? 'rgba(45,212,191,0.25)' : 'var(--signal-teal)',
              color: loading || !password ? 'var(--signal-teal)' : '#0f172a',
              border: 'none', borderRadius: 9, padding: '12px',
              fontWeight: 700, fontSize: '0.95rem',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
