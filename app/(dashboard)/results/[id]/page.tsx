'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { DimensionRadarChart } from '@/components/dashboard/DimensionRadarChart';
import { DimensionBarChart } from '@/components/dashboard/DimensionBarChart';
import { RiskSummary } from '@/components/dashboard/RiskSummary';
import { RecommendationsCard } from '@/components/dashboard/RecommendationsCard';
import { AssessmentResult, RecommendationResult, ClusterAnswer } from '@/lib/pig3/types';
import { ArrowLeft } from 'lucide-react';

export default function ResultsDetailPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.id as string;

  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (user && assessmentId) fetchData();
  }, [user, assessmentId]);

  async function fetchData() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();
      if (!userData?.organization_id) {
        setNotFound(true);
        return;
      }

      // Scope the lookup to the user's own organization — a participant
      // should not be able to view another organization's assessment by
      // guessing or sharing an ID.
      const { data: assessment } = await supabase
        .from('assessments')
        .select('id, status, completed_at')
        .eq('id', assessmentId)
        .eq('organization_id', userData.organization_id)
        .single();

      if (!assessment || assessment.status !== 'completed') {
        setNotFound(true);
        return;
      }
      setCompletedAt(assessment.completed_at);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData.organization_id)
        .single();
      if (orgData) setOrganizationName(orgData.name);

      const { data: answerRows } = await supabase
        .from('assessment_answers')
        .select('cluster_id, value')
        .eq('assessment_id', assessmentId);

      const { data: resultRow } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('assessment_id', assessmentId)
        .single();

      if (!resultRow || !answerRows) {
        setNotFound(true);
        return;
      }

      const clusterAnswers: ClusterAnswer[] = answerRows.map((r: any) => ({
        clusterId: r.cluster_id,
        value: r.value,
      }));

      setResult({
        clusterAnswers,
        indices: { pci: resultRow.pci, iri: resultRow.iri, gci: resultRow.gci, sli: resultRow.sli },
        pillarValues: { pValue: resultRow.p_value, iValue: resultRow.i_value, gValue: resultRow.g_value },
        pillarClassification: {
          p: resultRow.p_value >= 3.5 ? 'S' : resultRow.p_value >= 3.0 ? 'M' : 'W',
          i: resultRow.i_value >= 3.5 ? 'S' : resultRow.i_value >= 3.0 ? 'M' : 'W',
          g: resultRow.g_value >= 3.5 ? 'S' : resultRow.g_value >= 3.0 ? 'M' : 'W',
        },
        profile: { code: resultRow.profile_code, name: resultRow.profile_name, description: '' },
        state: { code: resultRow.state_code, urgency: resultRow.state_urgency, description: '' },
        composite: { bpi: resultRow.bpi, bas: resultRow.bas, bfs: resultRow.bfs },
      });

      const { data: recRow } = await supabase
        .from('recommendations')
        .select('*')
        .eq('assessment_result_id', resultRow.id)
        .single();

      if (recRow) {
        setRecommendations({
          rankedPriorities: recRow.ranked_priorities,
          topProtocols: recRow.top_protocols,
        });
      }
    } catch (error) {
      console.error('Error fetching assessment result:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-64" />
          <div className="card h-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-80" />
          <div className="card h-80" />
        </div>
      </div>
    );
  }

  if (notFound || !result || !recommendations) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-ink">Assessment not found</h2>
        <p className="text-sm text-ink-muted mt-2 max-w-sm mx-auto">
          This assessment doesn't exist, isn't complete yet, or doesn't belong to your organization.
        </p>
        <Link
          href="/assessments"
          className="inline-block mt-6 px-5 py-2.5 bg-signal-teal text-canvas text-sm font-medium rounded-lg hover:bg-signal-teal/90 transition-colors"
        >
          Back to Assessments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.push('/assessments')}
          className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </button>
        <h2 className="text-xl font-semibold text-ink">
          Assessment Results
          {completedAt && (
            <span className="text-base font-normal text-ink-muted">
              {' '}— {new Date(completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          )}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreCard result={result} organizationName={organizationName} />
        <RiskSummary rankedPriorities={recommendations.rankedPriorities} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DimensionRadarChart result={result} />
        <DimensionBarChart result={result} />
      </div>

      <RecommendationsCard recommendations={recommendations} />
    </div>
  );
}
