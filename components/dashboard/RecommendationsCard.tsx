'use client';

import { RecommendationResult } from '@/lib/pig3/types';

interface Props {
  recommendations: RecommendationResult;
}

export function RecommendationsCard({ recommendations }: Props) {
  const { rankedPriorities, topProtocols } = recommendations;
  const weakest = rankedPriorities.slice(0, 5);
  const strongest = [...rankedPriorities].reverse().slice(0, 3);

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-muted mb-4">Recommendations</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Strengths */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-signal-sage mb-3">Strongest Clusters</h4>
          <div className="space-y-2">
            {strongest.map(c => (
              <div key={c.clusterId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink-muted truncate">
                  <span className="font-mono text-xs text-ink-faint mr-1">{c.clusterId}{c.critical ? ' ★' : ''}</span>
                  {c.clusterName}
                </span>
                <span className="font-mono text-sm text-signal-sage flex-shrink-0">{c.score}/5</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-signal-rose mb-3">Lowest-Scoring Clusters</h4>
          <div className="space-y-2">
            {weakest.map(c => (
              <div key={c.clusterId} className="flex items-center justify-between gap-2">
                <span className="text-sm text-ink-muted truncate">
                  <span className="font-mono text-xs text-ink-faint mr-1">{c.clusterId}{c.critical ? ' ★' : ''}</span>
                  {c.clusterName}
                </span>
                <span className="font-mono text-sm text-signal-rose flex-shrink-0">{c.score}/5</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-faint mt-3">
            ★ = CRITICAL cluster — weakness here has outsized systemic impact.
          </p>
        </div>
      </div>

      {/* Protocols */}
      <div className="border-t border-border pt-5">
        <h4 className="text-xs font-medium uppercase tracking-wide text-signal-teal mb-4">Recommended Protocols</h4>
        <div className="space-y-3">
          {topProtocols.map((p, idx) => (
            <div key={p.id} className="flex gap-4 p-3 bg-canvas rounded-lg border border-border">
              <span className="text-xs font-mono text-ink-faint pt-0.5 flex-shrink-0">{idx + 1}.</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  <span className="text-signal-teal mr-1">{p.id}</span> {p.name}
                </p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">{p.purpose}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-ink-faint">
                  <span>{p.typicalDuration}</span>
                  <span>Re-measure: {p.reMeasureSchedule}</span>
                </div>
              </div>
            </div>
          ))}
          {topProtocols.length === 0 && (
            <p className="text-sm text-ink-faint">No clusters scored low enough to trigger a protocol recommendation yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
