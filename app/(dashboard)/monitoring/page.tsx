'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, Info } from 'lucide-react';

interface ResultRow {
  id: string;
  completed_at: string;
  pci: number;
  iri: number;
  gci: number;
  sli: number;
  state_code: string;
  state_urgency: string;
}

const DRIFT_ROWS = [
  { label: 'PCI', sub: 'Policy', key: 'pci' as const, inverse: false },
  { label: 'IRI', sub: 'Institutions', key: 'iri' as const, inverse: false },
  { label: 'GCI', sub: 'Governance', key: 'gci' as const, inverse: false },
  { label: 'SLI', sub: 'Structural Lag', key: 'sli' as const, inverse: true },
];

const INDEX_COLORS = {
  pci: '#6cc4b3',   // signal-teal
  iri: '#7c8cf8',   // signal-violet
  gci: '#f7c86a',   // signal-amber
  sli: '#f87171',   // signal-rose (inverted — lower is better)
};

export default function MonitoringPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();
      if (!userData?.organization_id) return;

      const { data } = await supabase
        .from('assessments')
        .select('id, completed_at, assessment_results (pci, iri, gci, sli, state_code, state_urgency)')
        .eq('organization_id', userData.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });

      if (data) {
        const normalized = data
          .map((a: any) => {
            const r = Array.isArray(a.assessment_results) ? a.assessment_results[0] : a.assessment_results;
            if (!r) return null;
            return { id: a.id, completed_at: a.completed_at, ...r } as ResultRow;
          })
          .filter(Boolean) as ResultRow[];
        setRows(normalized);
      }
    } catch (e) {
      console.error('Monitoring fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="card h-24" />
        <div className="card h-72" />
        <div className="card h-40" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-20">
        <Activity className="w-10 h-10 text-ink-faint mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">No assessment data yet</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          Complete your first assessment to begin tracking organizational health over time.
        </p>
      </div>
    );
  }

  if (rows.length === 1) {
    const r = rows[0];
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2.5 bg-surface border border-border rounded-lg px-4 py-3">
          <Info className="w-4 h-4 text-signal-teal mt-0.5 shrink-0" />
          <p className="text-xs text-ink-muted">
            You have one completed assessment. Run another assessment in 30–90 days to see how your
            indices are trending over time.
          </p>
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">Current snapshot</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DRIFT_ROWS.map(row => (
              <div key={row.key} className="bg-surface-sunken border border-border rounded-lg p-4">
                <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{row.label}</p>
                <p className="text-xs text-ink-muted">{row.sub}</p>
                <p className="text-2xl font-semibold font-mono text-ink mt-2">{Math.round(r[row.key])}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2+ assessments — show trend lines and drift
  const chartData = rows.map(r => ({
    date: new Date(r.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    PCI: Math.round(r.pci),
    IRI: Math.round(r.iri),
    GCI: Math.round(r.gci),
    SLI: Math.round(r.sli),
  }));

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const daysBetween = Math.max(
    1,
    Math.round((new Date(latest.completed_at).getTime() - new Date(previous.completed_at).getTime()) / 86400000)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <p className="text-sm text-ink-muted">
        {rows.length} assessment{rows.length !== 1 ? 's' : ''} ·{' '}
        latest compared to previous ({daysBetween} day{daysBetween !== 1 ? 's' : ''} apart)
      </p>

      {/* Trend chart */}
      <div className="card p-6">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">Index trends</h3>
        <p className="text-xs text-ink-faint mb-4">
          SLI (Structural Lag) is inverted — lower is healthier. All others: higher is healthier.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7590' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7590' }} width={32} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1d2433', border: '1px solid #2d3548', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#aab2c4' }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#aab2c4' }} />
            <Line type="monotone" dataKey="PCI" stroke={INDEX_COLORS.pci} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="IRI" stroke={INDEX_COLORS.iri} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="GCI" stroke={INDEX_COLORS.gci} strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="SLI" stroke={INDEX_COLORS.sli} strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Drift cards (latest vs previous) */}
      <div className="card p-6">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-4">
          Drift — latest vs previous
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DRIFT_ROWS.map(row => {
            const curr = latest[row.key];
            const prev = previous[row.key];
            const rawDelta = curr - prev;
            const improvement = row.inverse ? -rawDelta : rawDelta;
            const hasChange = Math.abs(rawDelta) >= 0.5;
            const color = hasChange
              ? improvement > 0 ? 'text-signal-sage' : 'text-signal-rose'
              : 'text-ink-faint';
            const sign = rawDelta > 0 ? '+' : '';
            return (
              <div key={row.key} className="bg-surface-sunken border border-border rounded-lg p-4">
                <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{row.label}</p>
                <p className="text-xs text-ink-muted">{row.sub}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold font-mono text-ink">{Math.round(curr)}</span>
                  {hasChange && (
                    <span className={`text-sm font-medium font-mono ${color}`}>
                      {sign}{rawDelta.toFixed(1)} {improvement > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-faint mt-1">was {Math.round(prev)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* State transition */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">
          Organizational state
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-faint mb-0.5">Previous</p>
            <p className="text-sm font-medium text-ink">{previous.state_code} · {previous.state_urgency}</p>
          </div>
          <div className="text-ink-faint text-lg">→</div>
          <div className="text-right">
            <p className="text-xs text-ink-faint mb-0.5">Current</p>
            <p className="text-sm font-medium text-ink">{latest.state_code} · {latest.state_urgency}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
