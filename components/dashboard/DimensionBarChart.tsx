'use client';

import { AssessmentResult } from '@/lib/pig3/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CLUSTERS } from '@/lib/pig3/clusters';

interface Props {
  result: AssessmentResult;
}

export function DimensionBarChart({ result }: Props) {
  const data = CLUSTERS.map(cluster => {
    const answer = result.clusterAnswers.find(a => a.clusterId === cluster.id);
    return {
      name: `${cluster.id}${cluster.critical ? ' ★' : ''} ${cluster.name}`,
      score: answer ? answer.value : 0,
      critical: cluster.critical,
    };
  });

  const getBarColor = (score: number) => {
    if (score >= 4) return '#8bb890';
    if (score === 3) return '#d4ad72';
    if (score === 2) return '#c2935f';
    return '#cf837a';
  };

  return (
    <div className="card p-6">
      <h3 className="text-sm font-medium text-ink-muted mb-4">All 29 Clusters (1–5 scale)</h3>
      <div className="h-[640px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 180, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#323b4d" />
            <XAxis type="number" domain={[0, 5]} tick={{ fill: '#aab2c4' }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#aab2c4' }} width={180} />
            <Tooltip
              formatter={(value: number) => [`${value}/5`, 'Score']}
              contentStyle={{ backgroundColor: '#1d2433', borderRadius: '8px', border: '1px solid #323b4d', color: '#f0f2f6' }}
              labelStyle={{ color: '#f0f2f6' }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-ink-faint">★ marks the 4 CRITICAL clusters (Chapter 9): 1C, 2E, 3B, 4A.</p>
    </div>
  );
}
