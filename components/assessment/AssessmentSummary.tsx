'use client';

import { useRouter } from 'next/navigation';
import { AssessmentResult, RecommendationResult } from '@/lib/pig3/types';
import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { DimensionRadarChart } from '@/components/dashboard/DimensionRadarChart';
import { DimensionBarChart } from '@/components/dashboard/DimensionBarChart';
import { RiskSummary } from '@/components/dashboard/RiskSummary';
import { RecommendationsCard } from '@/components/dashboard/RecommendationsCard';

interface Props {
  result: AssessmentResult;
  recommendations: RecommendationResult;
}

export function AssessmentSummary({ result, recommendations }: Props) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="card p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-signal-sage">Assessment complete</h2>
          <p className="text-sm text-ink-muted mt-0.5">Your PIG³ structural health results are ready.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-signal-teal text-canvas text-sm font-medium rounded-lg hover:bg-signal-teal/90 transition-colors"
        >
          View Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthScoreCard result={result} />
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
