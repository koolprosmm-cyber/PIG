'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { Users, Building, Mail, Shield } from 'lucide-react';

export default function SettingsPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [organization, setOrganization] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  async function fetchData() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();

      if (!userData) return;

      // Fetch organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userData.organization_id)
        .single();

      if (orgData) {
        setOrganization(orgData);
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from('organization_members')
        .select(`
          *,
          users (full_name, email)
        `)
        .eq('organization_id', userData.organization_id);

      if (membersData) {
        setMembers(membersData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="card h-40" />
        <div className="card h-40" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Organization */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Building className="w-5 h-5 text-ink-muted" />
          Organization
        </h3>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-ink-muted">Name</p>
            <p className="font-medium">{organization?.name}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Industry</p>
            <p className="font-medium">{organization?.industry || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Size</p>
            <p className="font-medium">{organization?.size || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-ink-muted">Stage</p>
            <p className="font-medium">{organization?.stage || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Users className="w-5 h-5 text-ink-muted" />
          Team Members
        </h3>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-surface-sunken rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-signal-teal/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-signal-teal">
                    {member.users?.full_name?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{member.users?.full_name}</p>
                  <p className="text-xs text-ink-muted">{member.users?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-muted uppercase">
                  {member.role}
                </span>
                <Shield className="w-4 h-4 text-ink-faint" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite */}
      <div className="card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Mail className="w-5 h-5 text-ink-muted" />
          Invite Team Members
        </h3>
        <p className="text-sm text-ink-faint mt-1 mb-4">Invite functionality coming soon.</p>
        <div className="flex gap-3 opacity-50 pointer-events-none select-none">
          <input
            type="email"
            placeholder="Enter email address"
            disabled
            className="flex-1 px-4 py-2 border border-border bg-surface-sunken text-ink placeholder:text-ink-faint rounded-lg cursor-not-allowed"
          />
          <select disabled className="px-4 py-2 border border-border bg-surface-sunken text-ink rounded-lg text-sm cursor-not-allowed">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button disabled className="px-6 py-2 bg-signal-teal text-canvas rounded-lg text-sm font-medium cursor-not-allowed">
            Invite
          </button>
        </div>
      </div>
    </div>
  );
}
