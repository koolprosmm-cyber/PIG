'use client';

import { ClusterCategory } from '@/lib/pig3/types';
import { CATEGORY_LABELS } from '@/lib/pig3/clusters';

interface Props {
  current: number;
  total: number;
  categoryProgress: Record<ClusterCategory, number>; // 0-100 per category
}

export function AssessmentProgress({ current, total, categoryProgress }: Props) {
  const percentage = Math.round((current / total) * 100);
  const categories: ClusterCategory[] = ['Policy', 'Institutions', 'Governance', 'CrossCutting'];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-ink">
          Question {current} of {total}
        </span>
        <span className="text-sm text-ink-muted">{percentage}% Complete</span>
      </div>

      <div className="w-full bg-surface-raised rounded-full h-2">
        <div className="bg-signal-teal h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {categories.map(cat => (
          <div key={cat} className="text-center">
            <div className="text-xs font-medium text-ink-muted">{CATEGORY_LABELS[cat]}</div>
            <div className="w-full bg-surface-raised rounded-full h-1.5 mt-1">
              <div
                className="bg-signal-teal h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${categoryProgress[cat] ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
