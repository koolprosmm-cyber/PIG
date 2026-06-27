'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'members' | 'invitations' | 'kb'

interface Member {
  id: string
  role: string
  user_id: string
  organization_id: string
  users: { full_name: string; email: string }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface KbStats {
  count: number
  lastUpdated: string | null
}

const ROLES = ['owner', 'admin', 'manager', 'staff'] as const

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '28px 30px',
  marginBottom: 24,
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ink-muted)',
  fontWeight: 700,
  margin: '0 0 16px',
}

const roleColors: Record<string, string> = {
  owner: 'var(--signal-teal)',
  admin: '#818cf8',
  manager: '#fb923c',
  staff: 'var(--ink-muted)',
}

function roleBadge(role: string) {
  const color = roleColors[role] ?? 'var(--ink-muted)'
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      color, border: `1px solid ${color}`, background: `${color}18`,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {role}
    </span>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [kbStats, setKbStats] = useState<KbStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingMember, setSavingMember] = useState<string | null>(null)
  const [cancellingInv, setCancellingInv] = useState<string | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, iRes, sRes] = await Promise.all([
        fetch('/api/admin/members'),
        fetch('/api/admin/invitations'),
        fetch('/api/admin/stats'),
      ])
      if (mRes.status === 401 || iRes.status === 401 || sRes.status === 401) {
        router.push('/admin-login')
        return
      }
      const [mData, iData, sData] = await Promise.all([mRes.json(), iRes.json(), sRes.json()])
      setMembers(Array.isArray(mData) ? mData : [])
      setInvitations(Array.isArray(iData) ? iData : [])
      setKbStats(sData.kb ?? null)
    } catch {
      setError('Failed to load data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleRoleChange(memberId: string, role: string) {
    setSavingMember(memberId)
    const res = await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    })
    if (res.ok) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m))
    }
    setSavingMember(null)
  }

  async function handleCancelInvitation(invitationId: string) {
    setCancellingInv(invitationId)
    const res = await fetch('/api/admin/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId, status: 'cancelled' }),
    })
    if (res.ok) {
      setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status: 'cancelled' } : i))
    }
    setCancellingInv(null)
  }

  async function handleSignOut() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin-login')
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--canvas)', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '1rem' }}>
            PIG<span style={{ color: 'var(--signal-teal)' }}>³</span> Admin
          </span>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', marginLeft: 12 }}>Management Panel</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: 'var(--ink-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>← Dashboard</a>
          <button onClick={handleSignOut} style={{
            padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--ink-muted)', fontSize: '0.82rem',
            cursor: 'pointer',
          }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: 'var(--signal-teal)', fontWeight: 800, margin: '0 0 4px', fontSize: '1.5rem' }}>Admin Panel</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', margin: 0 }}>Organization management for PIG³ Org Intelligence</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {([
            { key: 'members', label: `Members${members.length ? ` (${members.length})` : ''}` },
            { key: 'invitations', label: `Invitations${pendingInvitations.length ? ` (${pendingInvitations.length})` : ''}` },
            { key: 'kb', label: 'Knowledge Base' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
              background: tab === t.key ? 'rgba(45,212,191,0.1)' : 'var(--surface)',
              color: tab === t.key ? 'var(--signal-teal)' : 'var(--ink-muted)',
              fontWeight: tab === t.key ? 700 : 500,
              fontSize: '0.88rem', cursor: 'pointer',
              borderColor: tab === t.key ? 'var(--signal-teal)' : 'var(--border)',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: '14px 18px', background: 'rgba(226,100,90,0.1)', border: '1px solid rgba(226,100,90,0.3)', borderRadius: 10, color: '#e2645a', fontSize: '0.88rem', marginBottom: 24 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={card}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 52, background: 'var(--surface-raised)', borderRadius: 8, opacity: 0.5 }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── MEMBERS TAB ── */}
            {tab === 'members' && (
              <div style={card}>
                <p style={sectionLabel}>Team Members</p>
                {members.length === 0 ? (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem' }}>No members found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {members.map(member => (
                      <div key={member.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', background: 'var(--surface-raised)',
                        borderRadius: 10, border: '1px solid var(--border)',
                        flexWrap: 'wrap', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'rgba(45,212,191,0.1)',
                            border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.9rem', fontWeight: 700, color: 'var(--signal-teal)',
                          }}>
                            {(member.users?.full_name?.[0] ?? member.users?.email?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                              {member.users?.full_name || '—'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                              {member.users?.email}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {roleBadge(member.role)}
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member.id, e.target.value)}
                            disabled={savingMember === member.id}
                            style={{
                              padding: '6px 10px', borderRadius: 7, fontSize: '0.82rem',
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              color: 'var(--ink)', cursor: 'pointer',
                              opacity: savingMember === member.id ? 0.5 : 1,
                            }}
                          >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {savingMember === member.id && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Saving…</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── INVITATIONS TAB ── */}
            {tab === 'invitations' && (
              <div style={card}>
                <p style={sectionLabel}>Invitations</p>
                {invitations.length === 0 ? (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem' }}>No invitations found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {invitations.map(inv => (
                      <div key={inv.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', background: 'var(--surface-raised)',
                        borderRadius: 10, border: '1px solid var(--border)',
                        flexWrap: 'wrap', gap: 10,
                        opacity: inv.status !== 'pending' ? 0.5 : 1,
                      }}>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>{inv.email}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: 2 }}>
                            Role: {inv.role} · Sent {new Date(inv.created_at).toLocaleDateString()}
                            {inv.expires_at && ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: inv.status === 'pending' ? 'var(--signal-teal)' : 'var(--ink-muted)',
                            border: `1px solid ${inv.status === 'pending' ? 'var(--signal-teal)' : 'var(--border)'}`,
                            background: inv.status === 'pending' ? 'rgba(45,212,191,0.1)' : 'transparent',
                          }}>
                            {inv.status}
                          </span>
                          {inv.status === 'pending' && (
                            <button
                              onClick={() => handleCancelInvitation(inv.id)}
                              disabled={cancellingInv === inv.id}
                              style={{
                                padding: '6px 14px', borderRadius: 7, fontSize: '0.82rem',
                                background: 'rgba(226,100,90,0.1)', border: '1px solid rgba(226,100,90,0.3)',
                                color: '#e2645a', cursor: 'pointer', fontWeight: 600,
                                opacity: cancellingInv === inv.id ? 0.5 : 1,
                              }}
                            >
                              {cancellingInv === inv.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── KNOWLEDGE BASE TAB ── */}
            {tab === 'kb' && (
              <div style={card}>
                <p style={sectionLabel}>Knowledge Base</p>
                {kbStats ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{
                      padding: '20px 24px', background: 'var(--surface-raised)',
                      borderRadius: 10, border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Total Entries
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--signal-teal)' }}>
                        {kbStats.count.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      padding: '20px 24px', background: 'var(--surface-raised)',
                      borderRadius: 10, border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        Last Updated
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)' }}>
                        {kbStats.lastUpdated
                          ? new Date(kbStats.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                          : '—'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--ink-muted)', fontSize: '0.88rem' }}>No knowledge base data found.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
