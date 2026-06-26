'use client';

import { ClusterPriority } from '@/lib/pig3/types';

interface Props {
  rankedPriorities: ClusterPriority[];
}

export function RiskSummary({ rankedPriorities }: Props) {
  const lowest = rankedPriorities.slice(0, 2);
  const highest = [...rankedPriorities].reverse().slice(0, 2);

  const badge = (score: number) => {
    if (score >= 4) return { color: 'bg-signal-sage/10 text-signal-sage border border-signal-sage/20', label: 'Strong' };
    if (score === 3) return { color: 'bg-signal-amber/10 text-signal-amber border border-signal-amber/20', label: 'Moderate' };
    if (score === 2) return { color: 'bg-signal-rose/5 text-signal-amber border border-signal-amber/40', label: 'Weak' };
    return { color: 'bg-signal-rose/15 text-signal-rose border border-signal-rose/30', label: 'Critical' };
  };

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-muted mb-4">Risk Summary</h3>

      <div className="space-y-4">
        {lowest.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wide">Top Risks</h4>
            <div className="mt-2 space-y-2">
              {lowest.map((c: ClusterPriority) => {
                const b = badge(c.score);
                return (
                  <div key={c.clusterId} className="flex items-center justify-between">
                    <span className="text-sm text-ink">
                      {c.clusterId} {c.clusterName}
                      {c.critical ? ' ★' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink font-mono">{c.score}/5</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}>{b.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {highest.length > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-medium text-ink-faint uppercase tracking-wide">Top Strengths</h4>
            <div className="mt-2 space-y-2">
              {highest.map((c: ClusterPriority) => {
                const b = badge(c.score);
                return (
                  <div key={c.clusterId} className="flex items-center justify-between">
                    <span className="text-sm text-ink">
                      {c.clusterId} {c.clusterName}
                      {c.critical ? ' ★' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink font-mono">{c.score}/5</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.color}`}>{b.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
