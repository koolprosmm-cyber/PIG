'use client';

import { ClusterDefinition } from '@/lib/pig3/types';
import { CATEGORY_LABELS } from '@/lib/pig3/clusters';

interface Props {
  cluster: ClusterDefinition;
  currentAnswer: number | null;
  onAnswer: (value: number) => void;
}

export function AssessmentQuestion({ cluster, currentAnswer, onAnswer }: Props) {
  const options = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-signal-teal">
          {cluster.id}
          {cluster.critical ? ' ★' : ''}
        </span>
        <span className="text-xs text-ink-faint">•</span>
        <span className="text-xs text-ink-muted">{CATEGORY_LABELS[cluster.category]}</span>
        <span className="text-xs text-ink-faint">•</span>
        <span className="text-xs text-ink-muted">{cluster.name}</span>
      </div>
      <p className="text-lg font-medium text-ink">{cluster.question}</p>
      {cluster.critical && (
        <p className="text-xs text-signal-amber mt-1">
          ★ This is one of the 4 CRITICAL clusters — it has outsized impact on overall structural health.
        </p>
      )}

      <div className="mt-6 space-y-2.5">
        {options.map(option => (
          <label
            key={option.value}
            className={`
              flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
              ${currentAnswer === option.value
                ? 'border-signal-teal bg-signal-teal/10 text-ink'
                : 'border-border hover:border-border-light hover:bg-surface-raised text-ink-muted'}
            `}
          >
            <input
              type="radio"
              name={`cluster-${cluster.id}`}
              value={option.value}
              checked={currentAnswer === option.value}
              onChange={() => onAnswer(option.value)}
              className="sr-only"
            />
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              currentAnswer === option.value ? 'border-signal-teal' : 'border-border-light'
            }`}>
              {currentAnswer === option.value && (
                <span className="w-2 h-2 rounded-full bg-signal-teal" />
              )}
            </span>
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
