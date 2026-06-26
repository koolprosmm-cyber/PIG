'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { ClipboardList, CheckCircle2, Clock, Plus } from 'lucide-react';

interface AssessmentListItem {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  assessment_results: { profile_code: string; state_code: string; pci: number; iri: number; gci: number; sli: number } | null;
}

export default function AssessmentsListPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAssessments();
  }, [user]);

  async function fetchAssessments() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();
      if (!userData?.organization_id) return;

      const { data } = await supabase
        .from('assessments')
        .select('id, status, started_at, completed_at, assessment_results (profile_code, state_code, pci, iri, gci, sli)')
        .eq('organization_id', userData.organization_id)
        .order('started_at', { ascending: false });

      if (data) {
        // assessment_results comes back as an array from the join unless a
        // 1:1 relationship is declared in Supabase; normalize to a single object.
        const normalized = data.map((a: any) => ({
          ...a,
          assessment_results: Array.isArray(a.assessment_results) ? a.assessment_results[0] ?? null : a.assessment_results,
        }));
        setAssessments(normalized);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-3 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="card h-16" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-ink">Assessments</h2>
          <p className="text-sm text-ink-muted">All PIG³ assessments for your organization</p>
        </div>
        <Link
          href="/assessments/new"
          className="flex items-center gap-2 px-4 py-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </Link>
      </div>

      {assessments.length === 0 ? (
        <div className="text-center py-16 card">
          <ClipboardList className="w-10 h-10 text-ink-faint mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-ink">No assessments yet</h2>
          <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">Start your first PIG³ assessment to see your organization's structural health.</p>
          <Link
            href="/assessments/new"
            className="inline-block mt-6 px-6 py-3 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors"
          >
            Start Assessment
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => {
            const isComplete = a.status === 'completed';
            const results = a.assessment_results;

            return (
              <div
                key={a.id}
                className="card p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-signal-sage/10' : 'bg-signal-amber/10'}`}>
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-signal-sage" />
                    ) : (
                      <Clock className="w-5 h-5 text-signal-amber" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {isComplete
                        ? new Date(a.completed_at!).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                        : `Started ${new Date(a.started_at).toLocaleDateString()}`}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-ink-muted mt-0.5">
                      {isComplete && results ? (
                        <>
                          <span>Profile: {results.profile_code}</span>
                          <span className="text-ink-faint">|</span>
                          <span>PCI {results.pci} · IRI {results.iri} · GCI {results.gci} · SLI {results.sli}</span>
                        </>
                      ) : (
                        <span className="text-signal-amber">In progress — not yet completed</span>
                      )}
                    </div>
                  </div>
                </div>

                {isComplete ? (
                  <Link
                    href={`/results/${a.id}`}
                    className="px-4 py-2 text-sm text-signal-teal hover:text-signal-teal/80 font-medium"
                  >
                    View Results →
                  </Link>
                ) : (
                  <span className="px-4 py-2 text-sm text-ink-faint" title="Resuming an in-progress assessment isn't supported yet — this will start a new one.">
                    Incomplete
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
