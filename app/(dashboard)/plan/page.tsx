'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { ClusterAnswer, ProtocolDefinition, ProtocolId } from '@/lib/pig3/types';
import { buildProjectionPlan, indexDelta } from '@/lib/pig3/projection';
import { CalendarDays, CheckCircle2, Circle, Clock } from 'lucide-react';

type ProgressStatus = 'not_started' | 'in_progress' | 'complete';

const STATUS_NEXT: Record<ProgressStatus, ProgressStatus> = {
  not_started: 'in_progress',
  in_progress: 'complete',
  complete: 'not_started',
};

const STATUS_LABELS: Record<ProgressStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

// Group re-measure schedules into 90-day timeline buckets.
// Only schedules ≤ 90 days are included — this is what defines the 90-day plan scope.
const BUCKETS: { label: string; subtitle: string; schedules: string[] }[] = [
  { label: 'Week 1', subtitle: 'Start here — fast, high-leverage fixes', schedules: ['7 days'] },
  { label: 'Month 1', subtitle: 'Establish clarity and direction', schedules: ['30 days'] },
  { label: 'Month 2', subtitle: 'Build institutional capacity', schedules: ['60 days'] },
  { label: 'Month 3', subtitle: 'Structural and systemic work', schedules: ['90 days'] },
];

function StatusIcon({ status }: { status: ProgressStatus }) {
  if (status === 'complete') return <CheckCircle2 className="w-4 h-4 text-signal-sage" />;
  if (status === 'in_progress') return <Clock className="w-4 h-4 text-signal-amber" />;
  return <Circle className="w-4 h-4 text-ink-faint" />;
}

export default function PlanPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [protocols, setProtocols] = useState<ProtocolDefinition[]>([]);
  const [baselineAnswers, setBaselineAnswers] = useState<ClusterAnswer[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({});
  const [assessmentResultId, setAssessmentResultId] = useState<string | null>(null);
  const [assessmentDate, setAssessmentDate] = useState<string | null>(null);
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
        .select('id, completed_at')
        .eq('organization_id', userData.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);
      if (!assessments?.length) { setNoData(true); return; }

      const { id: assessmentId, completed_at } = assessments[0];
      setAssessmentDate(completed_at);

      const [{ data: answerRows }, { data: resultRow }] = await Promise.all([
        supabase.from('assessment_answers').select('cluster_id, value').eq('assessment_id', assessmentId),
        supabase.from('assessment_results').select('id').eq('assessment_id', assessmentId).single(),
      ]);
      if (!answerRows || !resultRow) { setNoData(true); return; }

      setBaselineAnswers(answerRows.map((r: any) => ({ clusterId: r.cluster_id, value: r.value })));
      setAssessmentResultId(resultRow.id);

      const [{ data: recRow }, { data: progressRows }] = await Promise.all([
        supabase.from('recommendations').select('top_protocols').eq('assessment_result_id', resultRow.id).single(),
        supabase.from('protocol_progress').select('protocol_id, status').eq('assessment_result_id', resultRow.id),
      ]);

      // Filter to protocols with reMeasureSchedule within 90 days — the 90-day plan scope
      const allTop: ProtocolDefinition[] = recRow?.top_protocols ?? [];
      const within90 = allTop.filter(p =>
        ['7 days', '30 days', '60 days', '90 days'].includes(p.reMeasureSchedule)
      );
      setProtocols(within90);

      const rec: Record<string, ProgressStatus> = {};
      (progressRows ?? []).forEach((r: any) => { rec[r.protocol_id] = r.status; });
      setProgress(rec);
    } catch (e) {
      console.error('90-day plan fetch error:', e);
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

  // Sequential projection over 90-day protocols only (same engine as Roadmap)
  const plan = protocols.length && baselineAnswers.length
    ? buildProjectionPlan(baselineAnswers, protocols.map(p => p.id as ProtocolId))
    : null;

  const completedCount = protocols.filter(p => (progress[p.id] ?? 'not_started') === 'complete').length;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="card h-20" />
        <div className="card h-40" />
        <div className="card h-40" />
      </div>
    );
  }

  if (noData || !protocols.length) {
    return (
      <div className="text-center py-20">
        <CalendarDays className="w-10 h-10 text-ink-faint mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">No plan yet</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          Complete your first assessment to generate your 90-day action plan.
        </p>
      </div>
    );
  }

  const planStartDate = assessmentDate ? new Date(assessmentDate) : new Date();
  const planEndDate = new Date(planStartDate);
  planEndDate.setDate(planEndDate.getDate() + 90);

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header / scope */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              {completedCount} of {protocols.length} actions complete
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Plan window:{' '}
              {planStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {' – '}
              {planEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-semibold font-mono text-ink">
              {Math.round((completedCount / protocols.length) * 100)}%
            </p>
            <p className="text-xs text-ink-faint">complete</p>
          </div>
        </div>
        <div className="mt-3 bg-surface-sunken rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-signal-teal transition-all duration-500"
            style={{ width: `${(completedCount / protocols.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-ink-faint mt-3">
          Protocols sourced from your assessment recommendations, sequenced by PIG³ Dependency
          Hierarchy. Click the status icon on any action to advance it. Progress is shared with
          Roadmap — updates appear in both views.
        </p>
      </div>

      {/* Timeline buckets */}
      {BUCKETS.map(bucket => {
        const bucketProtocols = protocols.filter(p => bucket.schedules.includes(p.reMeasureSchedule));
        if (!bucketProtocols.length) return null;

        return (
          <div key={bucket.label} className="space-y-2">
            <div className="flex items-baseline gap-3">
              <h3 className="text-sm font-semibold text-ink">{bucket.label}</h3>
              <span className="text-xs text-ink-faint">{bucket.subtitle}</span>
            </div>

            {bucketProtocols.map(protocol => {
              const status = progress[protocol.id] ?? 'not_started';
              // Find this protocol's index in the full sequence to pull its projected step gain
              const seqIndex = protocols.indexOf(protocol);
              const step = plan?.steps[seqIndex];
              const prevSnapshot = seqIndex === 0 ? plan?.baseline : plan?.steps[seqIndex - 1];
              const delta = step && prevSnapshot
                ? indexDelta(prevSnapshot.indices, step.indices)
                : null;
              const gains = delta
                ? [
                    { k: 'PCI', v: delta.pci },
                    { k: 'IRI', v: delta.iri },
                    { k: 'GCI', v: delta.gci },
                    { k: 'SLI', v: delta.sli },
                  ].filter(({ v }) => Math.abs(v) >= 0.1)
                : [];

              return (
                <div
                  key={protocol.id}
                  className={`card p-4 flex gap-3 transition-colors ${
                    status === 'complete'
                      ? 'border-signal-sage/30 bg-signal-sage/5'
                      : status === 'in_progress'
                      ? 'border-signal-amber/30 bg-signal-amber/5'
                      : ''
                  }`}
                >
                  <button
                    onClick={() => cycleStatus(protocol.id)}
                    disabled={saving === protocol.id}
                    className="mt-0.5 shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40"
                    title={`${STATUS_LABELS[status]} — click to advance`}
                  >
                    <StatusIcon status={status} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-signal-teal">{protocol.id}</span>
                      <span className="text-sm font-medium text-ink">{protocol.name}</span>
                      {status !== 'not_started' && (
                        <span className={`text-xs ${status === 'complete' ? 'text-signal-sage' : 'text-signal-amber'}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{protocol.purpose}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-ink-faint">
                        <span className="text-ink-muted">Effort </span>{protocol.typicalDuration}
                      </span>
                      <span className="text-xs text-ink-faint">
                        <span className="text-ink-muted">Check-in </span>{protocol.reMeasureSchedule}
                      </span>
                      {gains.length > 0 && (
                        <span className="text-xs text-ink-faint flex gap-1.5 flex-wrap">
                          <span className="text-ink-muted">Est. gain</span>
                          {gains.map(({ k, v }) => (
                            <span key={k} className={`font-mono ${v > 0 ? 'text-signal-sage' : 'text-signal-rose'}`}>
                              {k} {v > 0 ? '+' : ''}{v.toFixed(1)}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <p className="text-xs text-ink-faint pb-2">
        Est. gain values use a v1 bump curve derived from each protocol's re-measure schedule —
        a directional estimate, not a canonical PIG³ impact value.
      </p>
    </div>
  );
}
