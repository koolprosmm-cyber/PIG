// lib/pig3/projection.ts
//
// SHARED PROJECTION ENGINE — used by Scenarios, Roadmap, and Monitoring.
//
// v1 APPROXIMATION NOTICE:
// The bump values below are derived from each protocol's reMeasureSchedule
// field, which reflects how quickly the PIG³ framework expects measurable
// change after applying that protocol. The mapping:
//   7 days  → 1.00
//   30 days → 0.75
//   60 days → 0.55
//   90 days → 0.40
//
// These are a v1 directional estimate based on the framework's own change-
// velocity signal, NOT canonical PIG³ impact constants. No Chapter of the
// Master Bible specifies numeric per-protocol impact magnitudes; this curve
// is a product decision. The same "v1 approximation" honesty stance applies
// here as to the PCI/IRI/GCI/SLI formulas in scoring.ts.

import {
  ClusterAnswer,
  DiagnosticIndices,
  ProfileResult,
  ProtocolId,
  ProtocolDefinition,
} from './types';
import {
  calculateIndices,
  calculatePillarValues,
  classifyPillars,
  calculateProfile,
} from './scoring';
import { PROTOCOLS } from './protocols';

// v1 bump curve: reMeasureSchedule string → cluster score increment (1–5 scale)
const SCHEDULE_BUMP: Record<string, number> = {
  '7 days': 1.00,
  '30 days': 0.75,
  '60 days': 0.55,
  '90 days': 0.40,
};

export function getProtocolBump(protocol: ProtocolDefinition): number {
  return SCHEDULE_BUMP[protocol.reMeasureSchedule] ?? 0.75;
}

function applyProtocolToAnswers(
  answers: ClusterAnswer[],
  protocol: ProtocolDefinition
): ClusterAnswer[] {
  const bump = getProtocolBump(protocol);
  return answers.map(a =>
    protocol.targetClusters.includes(a.clusterId)
      ? { ...a, value: Math.min(5, a.value + bump) }
      : a
  );
}

export interface ProjectedSnapshot {
  label: string;
  clusterAnswers: ClusterAnswer[];
  indices: DiagnosticIndices;
  profile: ProfileResult;
  appliedProtocols: ProtocolId[];
}

export interface ProjectionPlan {
  baseline: ProjectedSnapshot;
  steps: ProjectedSnapshot[];           // one snapshot per protocol, applied in sequence
  historical?: ProjectedSnapshot[];     // populated only when 2+ real assessments exist
}

function snapshotFrom(
  answers: ClusterAnswer[],
  label: string,
  appliedProtocols: ProtocolId[]
): ProjectedSnapshot {
  const indices = calculateIndices(answers);
  const pillarValues = calculatePillarValues(indices);
  const profile = calculateProfile(pillarValues, classifyPillars(pillarValues));
  return { label, clusterAnswers: answers, indices, profile, appliedProtocols };
}

/**
 * Build a full sequential projection plan: baseline → after each protocol in order.
 * Protocol order should already be the Dependency Hierarchy order from recommendations.
 * Optionally accepts historical snapshots (from past assessments) to layer in.
 */
export function buildProjectionPlan(
  baselineAnswers: ClusterAnswer[],
  protocolIds: ProtocolId[],
  historicalSnapshots?: { label: string; answers: ClusterAnswer[] }[]
): ProjectionPlan {
  const baseline = snapshotFrom(baselineAnswers, 'Baseline', []);

  let current = baselineAnswers;
  const applied: ProtocolId[] = [];
  const steps: ProjectedSnapshot[] = [];

  for (const id of protocolIds) {
    const protocol = PROTOCOLS.find(p => p.id === id);
    if (!protocol) continue;
    applied.push(id);
    current = applyProtocolToAnswers(current, protocol);
    steps.push(snapshotFrom(current, `After ${id}`, [...applied]));
  }

  const historical = historicalSnapshots?.map(h =>
    snapshotFrom(h.answers, h.label, [])
  );

  return { baseline, steps, historical };
}

/**
 * Scenarios: project any ad-hoc selection of protocols (additive, unordered).
 * Returns a single projected snapshot rather than sequential steps.
 */
export function projectSelectedProtocols(
  baselineAnswers: ClusterAnswer[],
  selectedIds: ProtocolId[]
): ProjectedSnapshot {
  let answers = baselineAnswers;
  for (const id of selectedIds) {
    const protocol = PROTOCOLS.find(p => p.id === id);
    if (protocol) answers = applyProtocolToAnswers(answers, protocol);
  }
  return snapshotFrom(answers, 'Projected', selectedIds);
}

/**
 * Convenience: delta between two index snapshots, respecting SLI inversion.
 * Returns positive = improvement for all four indices.
 */
export function indexDelta(
  from: DiagnosticIndices,
  to: DiagnosticIndices
): { pci: number; iri: number; gci: number; sli: number } {
  return {
    pci: to.pci - from.pci,
    iri: to.iri - from.iri,
    gci: to.gci - from.gci,
    sli: from.sli - to.sli, // inverted: lower SLI is better, so decrease = improvement
  };
}
