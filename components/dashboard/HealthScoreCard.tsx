'use client';

import { AssessmentResult } from '@/lib/pig3/types';
import { ScoringDisclaimer } from './ScoringDisclaimer';

interface Props {
  result: AssessmentResult;
  organizationName?: string;
}

const URGENCY_COLOR: Record<string, string> = {
  Low: 'text-signal-sage bg-signal-sage/10 border border-signal-sage/20',
  Moderate: 'text-signal-amber bg-signal-amber/10 border border-signal-amber/20',
  High: 'text-signal-rose bg-signal-rose/10 border border-signal-rose/20',
  Severe: 'text-signal-rose bg-signal-rose/15 border border-signal-rose/30',
};

// Plain-English index explanations, one tier per health band, written against
// what each index actually measures (lib/pig3/scoring.ts) — not invented copy.
const INDEX_COPY: Record<
  'pci' | 'iri' | 'gci' | 'sli',
  { name: string; what: string; bands: { healthy: string; moderate: string; weak: string } }
> = {
  pci: {
    name: 'Policy Coherence Index',
    what: 'How well your written policies hold up — whether the rules you have are clear, consistent, and actually followed.',
    bands: {
      healthy: 'Your policies are clear and consistently applied — they\'re doing their job.',
      moderate: 'Policies exist but aren\'t consistently applied. The gap is in following through, not writing the rules.',
      weak: 'Policy is unclear, contradictory, or routinely ignored — this is foundational and worth fixing early.',
    },
  },
  iri: {
    name: 'Institutional Resilience Index',
    what: 'Whether the teams, roles, and systems built to carry out your policies can actually hold the weight — day to day, and under pressure.',
    bands: {
      healthy: 'Your structures are repeatable and resilient — work doesn\'t depend on any one person.',
      moderate: 'Institutions function but show strain — some workflows depend on specific people or informal habits.',
      weak: 'Workflows and accountability are fragmented. This is often the single biggest bottleneck on overall health.',
    },
  },
  gci: {
    name: 'Governance Clarity Index',
    what: 'Whether anyone can see clearly who decided what, and whether that decision will hold — the visibility and accountability of leadership decisions.',
    bands: {
      healthy: 'Decisions are clear, owned, and visible — governance is a genuine strength.',
      moderate: 'Decision ownership is somewhat unclear — leadership works, but accountability could be sharper.',
      weak: 'It\'s often unclear who decided what, or decisions don\'t hold once made.',
    },
  },
  sli: {
    name: 'Structural Lag Index',
    what: 'How far your actual day-to-day operations have drifted from your formal structure — informal workarounds, shadow processes, and rework. Lower is better.',
    bands: {
      healthy: 'Little drift between how work is supposed to happen and how it actually happens.',
      moderate: 'Some structural drift — informal workarounds are filling gaps the formal structure should cover.',
      weak: 'Significant drift — a lot of real work happens outside the formal structure, which compounds over time.',
    },
  },
};

function getBand(value: number, inverse: boolean): 'healthy' | 'moderate' | 'weak' {
  const healthy = inverse ? value < 40 : value >= 70;
  const moderate = inverse ? value >= 40 && value < 55 : value >= 50 && value < 70;
  return healthy ? 'healthy' : moderate ? 'moderate' : 'weak';
}

export function HealthScoreCard({ result, organizationName }: Props) {
  const { indices, profile, state } = result;

  const indexRows: Array<{ key: keyof typeof INDEX_COPY; value: number; inverse: boolean }> = [
    { key: 'pci', value: indices.pci, inverse: false },
    { key: 'iri', value: indices.iri, inverse: false },
    { key: 'gci', value: indices.gci, inverse: false },
    { key: 'sli', value: indices.sli, inverse: true },
  ];

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-muted mb-2">Organizational Profile</h3>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-semibold font-mono text-signal-teal">{profile.code}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${URGENCY_COLOR[state.urgency]}`}>
              {state.code} · {state.urgency} urgency
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-ink">{profile.name}</p>
          {organizationName && <p className="text-sm text-ink-faint mt-1">{organizationName}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <IndexBox label="PCI" sublabel="Policy" value={indices.pci} />
        <IndexBox label="IRI" sublabel="Institutions" value={indices.iri} />
        <IndexBox label="GCI" sublabel="Governance" value={indices.gci} />
        <IndexBox label="SLI" sublabel="Structural Lag" value={indices.sli} inverse />
      </div>

      {/* What the numbers mean — plain-English explanation per index, keyed to this org's actual values */}
      <div className="mt-5">
        <p className="text-xs font-medium text-ink-faint uppercase tracking-wide mb-2.5">
          What these numbers mean
        </p>
        <div className="space-y-2.5">
          {indexRows.map(({ key, value, inverse }) => {
            const copy = INDEX_COPY[key];
            const band = getBand(value, inverse);
            const dotColor =
              band === 'healthy' ? 'bg-signal-sage' : band === 'moderate' ? 'bg-signal-amber' : 'bg-signal-rose';
            return (
              <div key={key} className="bg-canvas border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className="text-xs font-medium text-ink font-mono">{key.toUpperCase()}</span>
                  <span className="text-xs text-ink-muted">— {copy.name}</span>
                </div>
                <p className="text-xs text-ink-faint mt-1 leading-relaxed">{copy.what}</p>
                <p className="text-sm text-ink-muted mt-1.5 leading-relaxed">{copy.bands[band]}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <ScoringDisclaimer />
      </div>
    </div>
  );
}

function IndexBox({
  label,
  sublabel,
  value,
  inverse = false,
}: {
  label: string;
  sublabel: string;
  value: number;
  inverse?: boolean;
}) {
  // For PCI/IRI/GCI, higher is better. For SLI, lower is better.
  const healthy = inverse ? value < 40 : value >= 70;
  const moderate = inverse ? value >= 40 && value < 55 : value >= 50 && value < 70;
  const color = healthy ? 'text-signal-sage' : moderate ? 'text-signal-amber' : 'text-signal-rose';

  return (
    <div className="text-center p-2.5 bg-surface-sunken rounded-lg border border-border">
      <div className={`text-2xl font-semibold font-mono ${color}`}>{value}</div>
      <div className="text-xs font-medium text-ink-muted">{label}</div>
      <div className="text-[10px] text-ink-faint">{sublabel}</div>
    </div>
  );
}
