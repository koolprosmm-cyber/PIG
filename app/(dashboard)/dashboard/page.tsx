'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { DimensionRadarChart } from '@/components/dashboard/DimensionRadarChart';
import { DimensionBarChart } from '@/components/dashboard/DimensionBarChart';
import { RiskSummary } from '@/components/dashboard/RiskSummary';
import { RecommendationsCard } from '@/components/dashboard/RecommendationsCard';
import { AssessmentResult, RecommendationResult, ClusterAnswer } from '@/lib/pig3/types';

export default function DashboardPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('clerk_id', user!.id)
          .single();
        if (!userData) return;

        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', userData.organization_id)
          .single();
        if (orgData) setOrganizationName(orgData.name);

        const { data: assessments } = await supabase
          .from('assessments')
          .select('id')
          .eq('organization_id', userData.organization_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1);

        if (assessments && assessments.length > 0) {
          const assessmentId = assessments[0].id;

          const { data: answerRows } = await supabase
            .from('assessment_answers')
            .select('cluster_id, value')
            .eq('assessment_id', assessmentId);

          const { data: resultRow } = await supabase
            .from('assessment_results')
            .select('*')
            .eq('assessment_id', assessmentId)
            .single();

          const { data: recRow } = await supabase
            .from('recommendations')
            .select('*')
            .eq('assessment_result_id', resultRow?.id)
            .single();

          if (resultRow && answerRows) {
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

            if (recRow) {
              setRecommendations({
                rankedPriorities: recRow.ranked_priorities,
                topProtocols: recRow.top_protocols,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
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

  if (!result || !recommendations) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold text-ink">No assessment yet</h2>
        <p className="text-ink-muted mt-2 max-w-sm">Complete your first PIG³ assessment to see your organizational health profile.</p>
        <Link href="/assessments/new" className="inline-block mt-6 px-6 py-2.5 bg-signal-teal text-canvas text-sm font-medium rounded-lg hover:bg-signal-teal/90 transition-colors">
          Start Assessment
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
