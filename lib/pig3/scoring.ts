// lib/pig3/scoring.ts
//
// PIG³ SCORING ENGINE — v1 (cluster-level approximation)
//
// Canonical source: Chapter 11 (Scoring Engine and Organizational Indices),
// Chapter 66 (Complete Formula Reference).
//
// v1 APPROXIMATION NOTICE (read before modifying):
// The canonical PCI/IRI/GCI formulas in Chapter 66 §66.3 are weighted
// combinations of NAMED RAW SUB-VARIABLES — e.g.:
//   PCI = 0.35×P1_score + 0.25×(100−P2_lag) + 0.25×(100−P4_lag) + 0.15×(100−P3_lag)
//   IRI = 0.30×I3_score + 0.30×(100−I1_lag) + 0.20×I2_speed + 0.20×(100−I4_lag)
//   GCI = 0.35×G1_score + 0.25×(100−G2_lag) + 0.25×G3_score + 0.15×G4_speed
// These sub-variables (e.g., Bus Factor, Decision Latency, Escalation
// Frequency) require operational data collection, which this MVP defers.
//
// For v1, each formula is APPROXIMATED by the simple average of its pillar's
// cluster scores (converted to a 0–100 scale). This is explicitly a stated
// approximation, not the canonical formula. The real SLI formula (Chapter 66
// §66.3) is built from 4 specific sub-variables (L1 Growth-Structure
// Mismatch, L2 Shadow System Intensity, L3 Formal vs. Actual Workflow
// Divergence, L4 Rework Rate) that have NO direct analogue in the 29 clusters
// — for v1, SLI is approximated from the Cross-Cutting clusters (4A–4F),
// which is the closest available proxy for systemic misalignment, but this
// is a NAMED PLACEHOLDER, not the canonical SLI. This must remain visible to
// users (see ScoringDisclaimer.tsx) until v2 implements real sub-variable
// collection.

import {
  ClusterAnswer,
  ClusterId,
  DiagnosticIndices,
  PillarValues,
  PillarClassification,
  SWMClassification,
  ProfileResult,
  ProfileCode,
  StateResult,
  CompositeIndices,
  AssessmentResult,
} from './types';
import { getClustersByCategory } from './clusters';

function clusterScore(answers: ClusterAnswer[], id: ClusterId): number {
  const found = answers.find(a => a.clusterId === id);
  return found ? found.value : 0; // 1–5 scale; 0 = unanswered
}

function averageTo100(answers: ClusterAnswer[], ids: ClusterId[]): number {
  const scores = ids.map(id => clusterScore(answers, id)).filter(s => s > 0);
  if (scores.length === 0) return 0;
  const avg1to5 = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Convert 1–5 scale to 0–100 scale: (avg - 1) / 4 * 100
  return Math.round(((avg1to5 - 1) / 4) * 100);
}

/**
 * v1 approximation of PCI (Policy Consistency Index).
 * Canonical formula: Chapter 66 §66.3. See file header note.
 */
export function calculatePCI(answers: ClusterAnswer[]): number {
  const policyIds = getClustersByCategory('Policy').map(c => c.id);
  return averageTo100(answers, policyIds);
}

/**
 * v1 approximation of IRI (Institutional Repeatability Index).
 * Canonical formula: Chapter 66 §66.3. See file header note.
 */
export function calculateIRI(answers: ClusterAnswer[]): number {
  const institutionsIds = getClustersByCategory('Institutions').map(c => c.id);
  return averageTo100(answers, institutionsIds);
}

/**
 * v1 approximation of GCI (Governance Clarity Index).
 * Canonical formula: Chapter 66 §66.3. See file header note.
 */
export function calculateGCI(answers: ClusterAnswer[]): number {
  const governanceIds = getClustersByCategory('Governance').map(c => c.id);
  return averageTo100(answers, governanceIds);
}

/**
 * v1 NAMED PLACEHOLDER for SLI (Structural Lag Index).
 * The canonical SLI (Chapter 66 §66.3) is built from L1–L4 structural-lag
 * sub-variables that this MVP does not yet collect. As a stand-in, this
 * approximates structural lag using the Cross-Cutting clusters (4A–4F),
 * since those most directly assess systemic misalignment and friction.
 * IMPORTANT: SLI is inverted relative to PCI/IRI/GCI — LOWER is better.
 */
export function calculateSLI(answers: ClusterAnswer[]): number {
  const crossCuttingIds = getClustersByCategory('CrossCutting').map(c => c.id);
  const healthScore = averageTo100(answers, crossCuttingIds); // higher = healthier alignment
  return Math.round(100 - healthScore); // invert: higher SLI = more structural lag
}

export function calculateIndices(answers: ClusterAnswer[]): DiagnosticIndices {
  return {
    pci: calculatePCI(answers),
    iri: calculateIRI(answers),
    gci: calculateGCI(answers),
    sli: calculateSLI(answers),
  };
}

/**
 * Pillar Value Conversion — Chapter 66 §66.4 (canonical, not approximated).
 * Pillar Value (1–5) = 1 + (Index ÷ 100 × 4)
 */
export function indexToPillarValue(index0to100: number): number {
  return Math.round((1 + (index0to100 / 100) * 4) * 100) / 100;
}

export function calculatePillarValues(indices: DiagnosticIndices): PillarValues {
  return {
    pValue: indexToPillarValue(indices.pci),
    iValue: indexToPillarValue(indices.iri),
    gValue: indexToPillarValue(indices.gci),
  };
}

/**
 * S/W/M Classification — Chapter 66 §66.4 (canonical).
 * >= 3.5 => S (Strong), 3.0–3.4 => M (Moderate/transitional), < 3.0 => W (Weak)
 */
export function classifyPillarValue(value: number): SWMClassification {
  if (value >= 3.5) return 'S';
  if (value >= 3.0) return 'M';
  return 'W';
}

export function classifyPillars(pv: PillarValues): PillarClassification {
  return {
    p: classifyPillarValue(pv.pValue),
    i: classifyPillarValue(pv.iValue),
    g: classifyPillarValue(pv.gValue),
  };
}

/**
 * Composite Indices — Chapter 66 §66.4 (canonical formulas; not approximated,
 * since they're computed directly from pillar values, which we do have).
 */
export function calculateComposite(pv: PillarValues): CompositeIndices {
  const bpi = Math.round(((pv.pValue + pv.iValue + pv.gValue) / 3) * 100) / 100;

  const mean = (pv.pValue + pv.iValue + pv.gValue) / 3;
  const variance =
    (Math.pow(pv.pValue - mean, 2) + Math.pow(pv.iValue - mean, 2) + Math.pow(pv.gValue - mean, 2)) / 3;
  const stdev = Math.sqrt(variance);
  const bas = Math.round((5 - stdev) * 100) / 100;

  const bfs =
    Math.round(
      ((Math.abs(pv.pValue - pv.iValue) + Math.abs(pv.iValue - pv.gValue) + Math.abs(pv.pValue - pv.gValue)) / 3) *
        100
    ) / 100;

  return { bpi, bas, bfs };
}

/**
 * The 8 Organizational Profiles — Chapter 12 (canonical).
 * Profile code uses S/W only (the Chapter 12 system is an 8-profile system,
 * not 27); an "M" (transitional) pillar resolves to its nearer neighbor:
 * M values >= 3.25 lean S, otherwise lean W, for profile-coding purposes only.
 * (This resolution rule is a v1 implementation choice for handling the
 * transitional band within the 8-profile system; it does not change the
 * underlying S/M/W classification shown to the user elsewhere.)
 */
const PROFILE_NAMES: Record<ProfileCode, { name: string; description: string }> = {
  SSS: { name: 'Aligned', description: 'All three pillars are strong and mutually reinforcing.' },
  SSW: {
    name: 'Governance Gap',
    description: 'Policy and Institutions are strong, but Governance is weak — accountability and decision rights need attention.',
  },
  SWS: {
    name: 'Paper Tiger',
    description: 'Policy and Governance are strong, but Institutions are weak — strategy and oversight exist, but execution capacity does not.',
  },
  WSS: {
    name: 'Lost Army',
    description: 'Institutions and Governance are strong, but Policy is weak — capable people and clear accountability lack direction.',
  },
  SWW: {
    name: 'Strategy Without Capacity',
    description: 'Only Policy is strong — clear direction without the institutional or governance capacity to deliver it.',
  },
  WSW: {
    name: 'Warning',
    description: 'Only Institutions are strong — operational capability exists without clear direction or accountability.',
  },
  WWS: {
    name: 'Governance-Only',
    description: 'Only Governance is strong — accountability structures exist without clear direction or delivery capacity.',
  },
  WWW: {
    name: 'Crisis',
    description: 'All three pillars are weak. The organization is at high risk of structural failure without urgent, sequenced intervention.',
  },
};

function resolveToSW(value: number, classification: SWMClassification): 'S' | 'W' {
  if (classification === 'S') return 'S';
  if (classification === 'W') return 'W';
  // M (transitional): resolve toward nearer boundary
  return value >= 3.25 ? 'S' : 'W';
}

export function calculateProfile(pv: PillarValues, pc: PillarClassification): ProfileResult {
  const p = resolveToSW(pv.pValue, pc.p);
  const i = resolveToSW(pv.iValue, pc.i);
  const g = resolveToSW(pv.gValue, pc.g);
  const code = `${p}${i}${g}` as ProfileCode;
  const meta = PROFILE_NAMES[code];
  return { code, name: meta.name, description: meta.description };
}

/**
 * State Classification — Chapter 14 (canonical universal states).
 * v1 implementation: derives state from the same pillar pattern plus SLI,
 * since the full state-classification sub-variables are part of the
 * deferred raw-sub-variable set. This is a reasonable, declared approximation
 * consistent with how profile and SLI are already computed in v1.
 */
export function calculateState(profile: ProfileResult, sli: number): StateResult {
  if (profile.code === 'SSS' && sli < 35) {
    return { code: 'SSS', urgency: 'Low', description: 'Structurally healthy. Maintain regular monitoring (see Chapter 62).' };
  }
  if (profile.code === 'WWW' || sli >= 70) {
    return {
      code: 'CRITICAL',
      urgency: 'Severe',
      description: 'Multiple pillars weak and/or structural lag is severe. Immediate, sequenced intervention required.',
    };
  }
  if (profile.code === 'WSW' || sli >= 55) {
    return {
      code: 'WWW',
      urgency: 'High',
      description: 'Significant structural weakness across multiple dimensions. Intervention should begin within weeks, not months.',
    };
  }
  return {
    code: 'WSW',
    urgency: 'Moderate',
    description: 'Mixed structural health with at least one weak pillar. Targeted intervention recommended.',
  };
}

export function calculateFullAssessment(answers: ClusterAnswer[]): AssessmentResult {
  const indices = calculateIndices(answers);
  const pillarValues = calculatePillarValues(indices);
  const pillarClassification = classifyPillars(pillarValues);
  const profile = calculateProfile(pillarValues, pillarClassification);
  const state = calculateState(profile, indices.sli);
  const composite = calculateComposite(pillarValues);

  return {
    clusterAnswers: answers,
    indices,
    pillarValues,
    pillarClassification,
    profile,
    state,
    composite,
  };
}
