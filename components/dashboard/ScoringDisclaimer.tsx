'use client';

export function ScoringDisclaimer() {
  return (
    <div className="bg-signal-teal/5 border border-signal-teal/20 rounded-lg p-3 text-xs text-ink-muted">
      <strong className="text-signal-teal">v1 lightweight assessment:</strong> These scores are calculated from 29
      cluster-level self-report answers (one per PIG³ cluster), not the full 92-element
      diagnostic. PCI, IRI, and GCI are approximated from cluster averages rather than
      their canonical raw sub-variable formulas; SLI is a named placeholder pending
      structural-lag data collection. Treat results as directional, not precise.
    </div>
  );
}
