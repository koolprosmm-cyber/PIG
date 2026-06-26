'use client';

import { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { ClusterAnswer, ProtocolDefinition, RecommendationResult } from '@/lib/pig3/types';
import { DiagnosticIndices } from '@/lib/pig3/types';
import { projectSelectedProtocols, indexDelta, getProtocolBump } from '@/lib/pig3/projection';
import { PROTOCOLS } from '@/lib/pig3/protocols';
import { TrendingUp, Info } from 'lucide-react';

interface IndexCardProps {
  label: string;
  code: string;
  baseline: number;
  projected: number;
  inverse?: boolean;
}

function IndexCard({ label, code, baseline, projected, inverse }: IndexCardProps) {
  const rawDelta = projected - baseline;
  const improvement = inverse ? -rawDelta : rawDelta;
  const hasChange = Math.abs(rawDelta) >= 0.5;
  const color = hasChange
    ? improvement > 0 ? 'text-signal-sage' : 'text-signal-rose'
    : 'text-ink-faint';
  const sign = rawDelta > 0 ? '+' : '';

  return (
    <div className="bg-surface-sunken border border-border rounded-lg p-4">
      <p className="text-xs font-medium text-ink-faint uppercase tracking-wide">{label}</p>
      <p className="text-xs text-ink-muted mt-0.5">{code}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold font-mono text-ink">{Math.round(projected)}</span>
        {hasChange && (
          <span className={`text-sm font-medium font-mono ${color}`}>
            {sign}{rawDelta.toFixed(1)} {improvement > 0 ? '↑' : '↓'}
          </span>
        )}
      </div>
      <p className="text-xs text-ink-faint mt-1">baseline {Math.round(baseline)}</p>
    </div>
  );
}

export default function ScenariosPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [baselineAnswers, setBaselineAnswers] = useState<ClusterAnswer[]>([]);
  const [baselineIndices, setBaselineIndices] = useState<DiagnosticIndices | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

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
      if (!userData?.organization_id) { setNoData(true); return; }

      const { data: assessments } = await supabase
        .from('assessments')
        .select('id')
        .eq('organization_id', userData.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
      if (!assessments?.length) { setNoData(true); return; }

      const assessmentId = assessments[0].id;

      const { data: answerRows } = await supabase
        .from('assessment_answers')
        .select('cluster_id, value')
        .eq('assessment_id', assessmentId);

      const { data: resultRow } = await supabase
        .from('assessment_results')
        .select('id, pci, iri, gci, sli')
        .eq('assessment_id', assessmentId)
        .single();

      if (!answerRows || !resultRow) { setNoData(true); return; }

      const answers: ClusterAnswer[] = answerRows.map((r: any) => ({
        clusterId: r.cluster_id,
        value: r.value,
      }));
      setBaselineAnswers(answers);
      setBaselineIndices({ pci: resultRow.pci, iri: resultRow.iri, gci: resultRow.gci, sli: resultRow.sli });

      const { data: recRow } = await supabase
        .from('recommendations')
        .select('ranked_priorities, top_protocols')
        .eq('assessment_result_id', resultRow.id)
        .single();
      if (recRow) {
        setRecommendations({ rankedPriorities: recRow.ranked_priorities, topProtocols: recRow.top_protocols });
      }
    } catch (e) {
      console.error('Scenarios fetch error:', e);
      setNoData(true);
    } finally {
      setLoading(false);
    }
  }

  const projected = useMemo(() => {
    if (!baselineAnswers.length || !selectedIds.size) return null;
    return projectSelectedProtocols(baselineAnswers, Array.from(selectedIds) as any);
  }, [baselineAnswers, selectedIds]);

  const delta = useMemo(() => {
    if (!baselineIndices || !projected) return null;
    return indexDelta(baselineIndices, projected.indices);
  }, [baselineIndices, projected]);

  const displayIndices = projected?.indices ?? baselineIndices;

  function toggleProtocol(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allProtocols: ProtocolDefinition[] = recommendations?.topProtocols.length
    ? recommendations.topProtocols
    : PROTOCOLS.slice(0, 8);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="card h-24" />
        <div className="grid grid-cols-2 gap-4">
          <div className="card h-48" />
          <div className="card h-48" />
        </div>
      </div>
    );
  }

  if (noData || !baselineIndices) {
    return (
      <div className="text-center py-20">
        <TrendingUp className="w-10 h-10 text-ink-faint mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">No assessment data yet</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          Complete your first assessment to explore how protocols would affect your indices.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Disclaimer */}
      <div className="flex gap-2.5 bg-surface border border-border rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-signal-teal mt-0.5 shrink-0" />
        <p className="text-xs text-ink-muted leading-relaxed">
          <strong className="text-ink">v1 projection — directional estimate only.</strong>{' '}
          Projected gains are calculated using a bump curve derived from each protocol's re-measure
          schedule (7d → +1.0, 30d → +0.75, 60d → +0.55, 90d → +0.40 on the 1–5 cluster scale).
          These values are a v1 product decision, not canonical PIG³ impact constants. Treat
          projections as directional signals, not forecasts.
        </p>
      </div>

      {/* Index grid */}
      <div>
        <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
          {selectedIds.size > 0 ? 'Projected indices' : 'Baseline indices'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IndexCard label="Policy" code="PCI" baseline={baselineIndices.pci} projected={displayIndices!.pci} />
          <IndexCard label="Institutions" code="IRI" baseline={baselineIndices.iri} projected={displayIndices!.iri} />
          <IndexCard label="Governance" code="GCI" baseline={baselineIndices.gci} projected={displayIndices!.gci} />
          <IndexCard label="Structural Lag" code="SLI" baseline={baselineIndices.sli} projected={displayIndices!.sli} inverse />
        </div>
      </div>

      {/* Net improvement summary */}
      {delta && selectedIds.size > 0 && (
        <div className="card p-4 flex flex-wrap gap-4">
          <span className="text-xs text-ink-faint uppercase tracking-wide self-center">Net improvement</span>
          {[
            { label: 'PCI', value: delta.pci },
            { label: 'IRI', value: delta.iri },
            { label: 'GCI', value: delta.gci },
            { label: 'SLI', value: delta.sli },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted font-mono">{label}</span>
              <span className={`text-sm font-semibold font-mono ${value > 0.5 ? 'text-signal-sage' : value < -0.5 ? 'text-signal-rose' : 'text-ink-muted'}`}>
                {value > 0 ? '+' : ''}{value.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Protocol selector */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
            What-if — select protocols to apply
          </h3>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-ink-faint hover:text-ink transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {allProtocols.map((p) => {
            const selected = selectedIds.has(p.id);
            const bump = getProtocolBump(p);
            return (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selected
                    ? 'border-signal-teal/50 bg-signal-teal/5'
                    : 'border-border hover:border-border-light bg-surface-sunken'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() => toggleProtocol(p.id)}
                />
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  selected ? 'bg-signal-teal border-signal-teal' : 'border-border'
                }`}>
                  {selected && <span className="text-canvas text-[10px] leading-none font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-signal-teal">{p.id}</span>
                    <span className="text-sm font-medium text-ink">{p.name}</span>
                    <span className="text-xs text-ink-faint ml-auto">+{bump.toFixed(2)} per cluster</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-0.5">{p.purpose}</p>
                  <p className="text-xs text-ink-faint mt-0.5">
                    {p.typicalDuration} · re-measure {p.reMeasureSchedule}
                    {' · targets '}
                    {p.targetClusters.join(', ')}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {projected && (
        <div className="card p-4">
          <p className="text-xs text-ink-muted">
            Projected profile:{' '}
            <span className="font-mono font-semibold text-signal-teal">{projected.profile.code}</span>{' '}
            <span className="text-ink">({projected.profile.name})</span>
          </p>
        </div>
      )}
    </div>
  );
}
