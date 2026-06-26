'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { ClusterAnswer, ProtocolDefinition, ProtocolId } from '@/lib/pig3/types';
import { buildProjectionPlan, indexDelta } from '@/lib/pig3/projection';
import { MapIcon, Info, CheckCircle2, Circle, Clock } from 'lucide-react';

type ProgressStatus = 'not_started' | 'in_progress' | 'complete';

const STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

const STATUS_COLORS: Record<ProgressStatus, string> = {
  not_started: 'text-ink-faint',
  in_progress: 'text-signal-amber',
  complete: 'text-signal-sage',
};

const STATUS_NEXT: Record<ProgressStatus, ProgressStatus> = {
  not_started: 'in_progress',
  in_progress: 'complete',
  complete: 'not_started',
};

function StatusIcon({ status }: { status: ProgressStatus }) {
  if (status === 'complete') return <CheckCircle2 className="w-5 h-5 text-signal-sage" />;
  if (status === 'in_progress') return <Clock className="w-5 h-5 text-signal-amber" />;
  return <Circle className="w-5 h-5 text-ink-faint" />;
}

export default function RoadmapPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [baselineAnswers, setBaselineAnswers] = useState<ClusterAnswer[]>([]);
  const [protocols, setProtocols] = useState<ProtocolDefinition[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({});
  const [assessmentResultId, setAssessmentResultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user.id)
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

      const [{ data: answerRows }, { data: resultRow }] = await Promise.all([
        supabase.from('assessment_answers').select('cluster_id, value').eq('assessment_id', assessmentId),
        supabase.from('assessment_results').select('id').eq('assessment_id', assessmentId).single(),
      ]);

      if (!answerRows || !resultRow) { setNoData(true); return; }

      const answers: ClusterAnswer[] = answerRows.map((r: any) => ({
        clusterId: r.cluster_id,
        value: r.value,
      }));
      setBaselineAnswers(answers);
      setAssessmentResultId(resultRow.id);

      const [{ data: recRow }, { data: progressRows }] = await Promise.all([
        supabase.from('recommendations').select('top_protocols').eq('assessment_result_id', resultRow.id).single(),
        supabase.from('protocol_progress').select('protocol_id, status').eq('assessment_result_id', resultRow.id),
      ]);

      const topProtocols: ProtocolDefinition[] = recRow?.top_protocols ?? [];
      setProtocols(topProtocols);

      const rec: Record<string, ProgressStatus> = {};
      (progressRows ?? []).forEach((r: any) => { rec[r.protocol_id] = r.status; });
      setProgress(rec);
    } catch (e) {
      console.error('Roadmap fetch error:', e);
      setNoData(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function cycleStatus(protocolId: string) {
    if (!assessmentResultId) return;
    const current: ProgressStatus = progress[protocolId] ?? 'not_started';
    const next = STATUS_NEXT[current];
    setSaving(protocolId);

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      assessment_result_id: assessmentResultId,
      protocol_id: protocolId,
      status: next,
      updated_at: now,
    };
    if (next === 'in_progress') payload.started_at = now;
    if (next === 'complete') payload.completed_at = now;
    if (next === 'not_started') { payload.started_at = null; payload.completed_at = null; }

    await supabase.from('protocol_progress').upsert(payload, {
      onConflict: 'assessment_result_id,protocol_id',
    });

    setProgress(prev => ({ ...prev, [protocolId]: next }));
    setSaving(null);
  }

  const plan = protocols.length && baselineAnswers.length
    ? buildProjectionPlan(baselineAnswers, protocols.map(p => p.id as ProtocolId))
    : null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="card h-24" />
        {[1, 2, 3].map(i => <div key={i} className="card h-28" />)}
      </div>
    );
  }

  if (noData || !protocols.length) {
    return (
      <div className="text-center py-20">
        <MapIcon className="w-10 h-10 text-ink-faint mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">No roadmap yet</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          Complete your first assessment to generate a sequenced intervention roadmap.
        </p>
      </div>
    );
  }

  const completedCount = protocols.filter(p => (progress[p.id] ?? 'not_started') === 'complete').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Disclaimer */}
      <div className="flex gap-2.5 bg-surface border border-border rounded-lg px-4 py-3">
        <Info className="w-4 h-4 text-signal-teal mt-0.5 shrink-0" />
        <p className="text-xs text-ink-muted leading-relaxed">
          <strong className="text-ink">v1 projection — directional estimate only.</strong>{' '}
          Expected index gains use a bump curve derived from each protocol's re-measure schedule.
          This is a v1 product decision, not a canonical PIG³ impact value. Treat deltas as
          directional signals. Protocols are sequenced by the PIG³ Dependency Hierarchy
          (Chapter 36 §36.3).
        </p>
      </div>

      {/* Progress summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">
              {completedCount} of {protocols.length} protocols complete
            </p>
            <p className="text-xs text-ink-muted mt-0.5">Click any status icon to advance it</p>
          </div>
          <div className="flex items-center gap-1.5">
            {protocols.map(p => {
              const s = progress[p.id] ?? 'not_started';
              return (
                <div
                  key={p.id}
                  className={`w-2 h-2 rounded-full ${
                    s === 'complete' ? 'bg-signal-sage' :
                    s === 'in_progress' ? 'bg-signal-amber' :
                    'bg-border'
                  }`}
                  title={`${p.id} — ${STATUS_LABELS[s]}`}
                />
              );
            })}
          </div>
        </div>
        <div className="mt-3 bg-surface-sunken rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-signal-teal transition-all duration-500"
            style={{ width: `${(completedCount / protocols.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Protocol timeline */}
      <div className="space-y-0">
        {protocols.map((protocol, index) => {
          const status = progress[protocol.id] ?? 'not_started';
          const step = plan?.steps[index];
          const prevSnapshot = index === 0 ? plan?.baseline : plan?.steps[index - 1];
          const delta = step && prevSnapshot
            ? indexDelta(prevSnapshot.indices, step.indices)
            : null;
          const isLast = index === protocols.length - 1;

          return (
            <div key={protocol.id} className="flex gap-4">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => cycleStatus(protocol.id)}
                  disabled={saving === protocol.id}
                  className="mt-5 transition-opacity hover:opacity-70 disabled:opacity-40"
                  title={`Click to advance: ${STATUS_LABELS[status]}`}
                >
                  <StatusIcon status={status} />
                </button>
                {!isLast && <div className="w-px flex-1 bg-border mt-1 min-h-[1.5rem]" />}
              </div>

              {/* Card */}
              <div className={`flex-1 mb-3 p-4 rounded-lg border transition-colors ${
                status === 'complete'
                  ? 'border-signal-sage/30 bg-signal-sage/5'
                  : status === 'in_progress'
                  ? 'border-signal-amber/30 bg-signal-amber/5'
                  : 'border-border bg-surface'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-signal-teal">{protocol.id}</span>
                      <span className="text-sm font-medium text-ink">{protocol.name}</span>
                      <span className={`text-xs font-medium ${STATUS_COLORS[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{protocol.purpose}</p>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      <span className="text-xs text-ink-faint">
                        <span className="text-ink-muted">Duration </span>{protocol.typicalDuration}
                      </span>
                      <span className="text-xs text-ink-faint">
                        <span className="text-ink-muted">Re-measure </span>{protocol.reMeasureSchedule}
                      </span>
                      <span className="text-xs text-ink-faint">
                        <span className="text-ink-muted">Targets </span>{protocol.targetClusters.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Projected delta for this step */}
                  {delta && (
                    <div className="text-right shrink-0">
                      <p className="text-xs text-ink-faint uppercase tracking-wide mb-1">Step gain</p>
                      {[
                        { k: 'PCI', v: delta.pci },
                        { k: 'IRI', v: delta.iri },
                        { k: 'GCI', v: delta.gci },
                        { k: 'SLI', v: delta.sli },
                      ].filter(({ v }) => Math.abs(v) >= 0.1).map(({ k, v }) => (
                        <p key={k} className="text-xs font-mono">
                          <span className="text-ink-faint">{k} </span>
                          <span className={v > 0 ? 'text-signal-sage' : 'text-signal-rose'}>
                            {v > 0 ? '+' : ''}{v.toFixed(1)}
                          </span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cumulative full-roadmap projection */}
      {plan && plan.steps.length > 0 && (
        <div className="card p-5">
          <h3 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">
            Full roadmap projection (all {protocols.length} protocols)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['pci', 'iri', 'gci', 'sli'] as const).map(key => {
              const labels: Record<string, string> = { pci: 'PCI', iri: 'IRI', gci: 'GCI', sli: 'SLI' };
              const finalVal = plan.steps[plan.steps.length - 1].indices[key];
              const baseVal = plan.baseline.indices[key];
              const rawDelta = finalVal - baseVal;
              const improvement = key === 'sli' ? -rawDelta : rawDelta;
              return (
                <div key={key} className="bg-surface-sunken border border-border rounded-lg p-3">
                  <p className="text-xs text-ink-faint uppercase tracking-wide">{labels[key]}</p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-xl font-semibold font-mono text-ink">{Math.round(finalVal)}</span>
                    <span className={`text-xs font-mono ${improvement > 0.5 ? 'text-signal-sage' : improvement < -0.5 ? 'text-signal-rose' : 'text-ink-faint'}`}>
                      {rawDelta > 0 ? '+' : ''}{rawDelta.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-faint mt-0.5">was {Math.round(baseVal)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
