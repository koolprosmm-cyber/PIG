'use client';

import { AssessmentResult } from '@/lib/pig3/types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface Props {
  result: AssessmentResult;
}

export function DimensionRadarChart({ result }: Props) {
  const { indices } = result;
  // SLI is inverted to a "health" framing (100 - SLI) purely for this chart,
  // so all four axes share the same "higher is better" visual direction.
  // The raw SLI value (where lower is better) is still shown correctly
  // elsewhere (HealthScoreCard).
  const data = [
    { axis: 'PCI (Policy)', score: indices.pci, fullMark: 100 },
    { axis: 'IRI (Institutions)', score: indices.iri, fullMark: 100 },
    { axis: 'GCI (Governance)', score: indices.gci, fullMark: 100 },
    { axis: 'Structural Stability (100−SLI)', score: 100 - indices.sli, fullMark: 100 },
  ];

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-muted mb-4">Pillar Scores</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#323b4d" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#aab2c4' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#7c869c' }} />
            <Radar name="PIG³ Indices" dataKey="score" stroke="#6cc4b3" fill="#6cc4b3" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-faint">
        Note: the fourth axis shows structural stability (100 − SLI) so all axes read
        "higher is better" visually. SLI itself is reported normally elsewhere.
      </p>
    </div>
  );
}
