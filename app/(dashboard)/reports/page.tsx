'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { FileText, Download } from 'lucide-react';

interface Assessment {
  id: string;
  completed_at: string;
  assessment_results: any; // single row shape from the join below
}

export default function ReportsPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssessments();
    }
  }, [user]);

  async function fetchAssessments() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();

      if (!userData) return;

      const { data } = await supabase
        .from('assessments')
        .select(`
          id,
          completed_at,
          assessment_results (*)
        `)
        .eq('organization_id', userData.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (data) {
        setAssessments(data as any);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = (assessmentId: string) => {
    window.open(`/api/reports/${assessmentId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-3 animate-pulse">
        {[1, 2].map(i => <div key={i} className="card h-16" />)}
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-20">
        <FileText className="w-10 h-10 text-ink-faint mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-ink">No reports yet</h2>
        <p className="text-sm text-ink-muted mt-2">Complete an assessment to generate your first report.</p>
        <Link
          href="/assessments/new"
          className="inline-block mt-6 px-5 py-2.5 bg-signal-teal text-canvas text-sm font-medium rounded-lg hover:bg-signal-teal/90 transition-colors"
        >
          Start Assessment
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink">Reports</h2>
        <p className="text-sm text-ink-muted">Download assessment reports for sharing with leadership</p>
      </div>

      <div className="space-y-4">
        {assessments.map((assessment) => {
          // assessment_results comes back as an array from the join unless
          // a 1:1 relationship is declared in Supabase; handle both shapes.
          const results = Array.isArray(assessment.assessment_results)
            ? assessment.assessment_results[0]
            : assessment.assessment_results;

          if (!results) return null;

          return (
            <div key={assessment.id} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-signal-teal/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-signal-teal" />
                </div>
                <div>
                  <h3 className="font-medium text-ink">
                    {new Date(assessment.completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    <span className="ml-2 text-sm font-normal text-ink-muted">· Profile {results.profile_code}</span>
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-ink-muted mt-0.5">
                    <span>PCI <span className="font-mono text-ink">{results.pci}</span></span>
                    <span>IRI <span className="font-mono text-ink">{results.iri}</span></span>
                    <span>GCI <span className="font-mono text-ink">{results.gci}</span></span>
                    <span>SLI <span className="font-mono text-ink">{results.sli}</span></span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownload(assessment.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-signal-teal border border-signal-teal/30 hover:bg-signal-teal/10 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
