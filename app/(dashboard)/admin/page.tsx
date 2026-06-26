'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase/client';
import { ShieldAlert, Users, Mail, Database } from 'lucide-react';

const ROLES = ['owner', 'admin', 'manager', 'staff'] as const;
type Role = typeof ROLES[number];

interface Member {
  id: string;
  role: Role;
  user_id: string;
  users: { full_name: string; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

interface KbStats {
  count: number;
  lastUpdated: string | null;
}

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [kbStats, setKbStats] = useState<KbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMember, setSavingMember] = useState<string | null>(null);
  const [cancellingInv, setCancellingInv] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id, organization_id')
        .eq('clerk_id', user.id)
        .single();
      if (!userData?.organization_id) { setLoading(false); return; }
      setOrgId(userData.organization_id);

      // Check caller's role
      const { data: myMembership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', userData.organization_id)
        .eq('user_id', userData.id)
        .single();
      setMyRole(myMembership?.role ?? null);

      if (!myMembership || !['owner', 'admin'].includes(myMembership.role)) {
        setLoading(false);
        return;
      }

      // Members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select('id, role, user_id, users (full_name, email)')
        .eq('organization_id', userData.organization_id);
      setMembers((membersData as any[]) ?? []);

      // Invitations
      const { data: invData } = await supabase
        .from('invitations')
        .select('id, email, role, status, expires_at, created_at')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false });
      setInvitations(invData ?? []);

      // Knowledge base stats
      const { count } = await supabase
        .from('knowledge_base')
        .select('id', { count: 'exact', head: true });
      const { data: lastRow } = await supabase
        .from('knowledge_base')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setKbStats({ count: count ?? 0, lastUpdated: lastRow?.created_at ?? null });
    } catch (e) {
      console.error('Admin fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (isLoaded) fetchData(); }, [isLoaded, fetchData]);

  async function updateRole(memberId: string, role: Role) {
    setSavingMember(memberId);
    await fetch('/api/admin/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
    setSavingMember(null);
  }

  async function cancelInvitation(invitationId: string) {
    setCancellingInv(invitationId);
    await fetch('/api/admin/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId, status: 'cancelled' }),
    });
    setInvitations(prev => prev.map(i => i.id === invitationId ? { ...i, status: 'cancelled' } : i));
    setCancellingInv(null);
  }

  if (!isLoaded || loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="card h-24" />
        <div className="card h-48" />
        <div className="card h-32" />
      </div>
    );
  }

  if (!myRole || !['owner', 'admin'].includes(myRole)) {
    return (
      <div className="text-center py-20">
        <ShieldAlert className="w-10 h-10 text-signal-rose mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">Access denied</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          This page is only accessible to organization admins and owners.
        </p>
      </div>
    );
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const otherInvitations = invitations.filter(i => i.status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Members */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">
          <Users className="w-4 h-4" />
          Members
        </h3>
        <div className="space-y-2">
          {members.map(member => {
            const isMe = member.users?.email === user?.emailAddresses[0]?.emailAddress;
            return (
              <div key={member.id} className="flex items-center justify-between p-3 bg-surface-sunken border border-border rounded-lg gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-signal-teal/10 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-signal-teal">
                      {member.users?.full_name?.[0] ?? '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {member.users?.full_name}
                      {isMe && <span className="ml-1.5 text-xs text-ink-faint">(you)</span>}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{member.users?.email}</p>
                  </div>
                </div>
                <select
                  value={member.role}
                  disabled={savingMember === member.id || isMe}
                  onChange={e => updateRole(member.id, e.target.value as Role)}
                  className="text-xs bg-surface border border-border text-ink rounded-md px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="text-sm text-ink-faint text-center py-4">No members found.</p>
          )}
        </div>
      </div>

      {/* Invitations */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">
          <Mail className="w-4 h-4" />
          Invitations
        </h3>

        {pendingInvitations.length === 0 && otherInvitations.length === 0 && (
          <p className="text-sm text-ink-faint text-center py-4">No invitations sent yet.</p>
        )}

        {pendingInvitations.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-ink-faint uppercase tracking-wide mb-2">Pending</p>
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-sunken border border-border rounded-lg gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{inv.email}</p>
                  <p className="text-xs text-ink-muted">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => cancelInvitation(inv.id)}
                  disabled={cancellingInv === inv.id}
                  className="text-xs text-signal-rose hover:text-signal-rose/80 font-medium disabled:opacity-40 shrink-0"
                >
                  {cancellingInv === inv.id ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            ))}
          </div>
        )}

        {otherInvitations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-ink-faint uppercase tracking-wide mb-2">History</p>
            {otherInvitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-sunken border border-border rounded-lg gap-3 opacity-60">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{inv.email}</p>
                  <p className="text-xs text-ink-muted">{inv.role}</p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  inv.status === 'accepted' ? 'text-signal-sage' :
                  inv.status === 'cancelled' ? 'text-ink-faint' :
                  'text-signal-amber'
                }`}>
                  {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Knowledge Base Stats */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">
          <Database className="w-4 h-4" />
          Knowledge Base
        </h3>
        {kbStats !== null ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-sunken border border-border rounded-lg p-4">
              <p className="text-xs text-ink-faint uppercase tracking-wide">Chunks loaded</p>
              <p className={`text-2xl font-semibold font-mono mt-1 ${kbStats.count > 0 ? 'text-signal-sage' : 'text-signal-rose'}`}>
                {kbStats.count}
              </p>
              {kbStats.count === 0 && (
                <p className="text-xs text-signal-rose mt-1">Master Bible not loaded — run kb:chunk + kb:embed</p>
              )}
            </div>
            <div className="bg-surface-sunken border border-border rounded-lg p-4">
              <p className="text-xs text-ink-faint uppercase tracking-wide">Last updated</p>
              <p className="text-sm font-medium text-ink mt-1">
                {kbStats.lastUpdated
                  ? new Date(kbStats.lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">Could not load knowledge base stats.</p>
        )}
      </div>

    </div>
  );
}
