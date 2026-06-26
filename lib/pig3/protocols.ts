// lib/pig3/protocols.ts
//
// THE 16 PIG³ INTERVENTION PROTOCOLS
// Source: Chapters 36–41 (Part IX — The 16 Intervention Protocols).
//
// This replaces the original draft's invented "INT-01...INT-14" intervention
// catalog, which did not correspond to anything in the PIG³ framework. The
// real framework defines exactly 16 named protocols across 4 families:
// Governance (G), Institutions (I), Policy (P), Structural Lag (L).
//
// v1 NOTE: targetClusters below maps each protocol to the cluster(s) it most
// directly addresses, for the purpose of v1's ranked-weakness recommendation
// logic (see recommendations.ts). The real Protocol Trigger Matrix (Chapter
// 36 §36.2) evaluates specific raw sub-variable thresholds (e.g., "G1 < 70%"),
// which v1 defers per the cluster-level simplification — see scoring.ts header.

import { ProtocolDefinition } from './types';

export const PROTOCOLS: ProtocolDefinition[] = [
  // ===== GOVERNANCE PROTOCOLS (Chapter 37) =====
  {
    id: 'G-1', family: 'G', name: 'Ownership Assignment',
    targetClusters: ['3A', '3B'],
    purpose: 'Assigns a single, named, willing owner to every goal or decision currently lacking clear ownership.',
    typicalDuration: '2–4 hours', reMeasureSchedule: '7 days',
  },
  {
    id: 'G-2', family: 'G', name: 'Escalation Compression',
    targetClusters: ['3A'],
    purpose: 'Reduces unnecessary escalation by clarifying and publishing decision-authority boundaries.',
    typicalDuration: '3–5 days', reMeasureSchedule: '30 days',
  },
  {
    id: 'G-3', family: 'G', name: 'Accountability Reconstruction',
    targetClusters: ['3B'],
    purpose: 'Rebuilds traceability between missed goals and the specific individuals responsible for them.',
    typicalDuration: '1 week', reMeasureSchedule: '30 days',
  },
  {
    id: 'G-4', family: 'G', name: 'Decision Latency Reduction',
    targetClusters: ['3A'],
    purpose: 'Shortens the time between issue detection and a recorded, communicated decision.',
    typicalDuration: '2 weeks', reMeasureSchedule: '30 days',
  },

  // ===== INSTITUTION PROTOCOLS (Chapter 38) =====
  {
    id: 'I-1', family: 'I', name: 'Bus Factor Cross-Training',
    targetClusters: ['2A', '2B'],
    purpose: 'Eliminates single points of failure by cross-training a second person on each critical process.',
    typicalDuration: '2–4 weeks per process', reMeasureSchedule: '60 days',
  },
  {
    id: 'I-2', family: 'I', name: 'Onboarding Acceleration',
    targetClusters: ['2B'],
    purpose: 'Reduces new-hire time-to-productivity through structured runbooks and buddy support.',
    typicalDuration: '4–8 weeks', reMeasureSchedule: '90 days',
  },
  {
    id: 'I-3', family: 'I', name: 'Documentation Remediation',
    targetClusters: ['2D'],
    purpose: 'Extracts tacit knowledge from subject matter experts into accessible, actively-used documentation.',
    typicalDuration: '4–12 weeks', reMeasureSchedule: '90 days',
  },
  {
    id: 'I-4', family: 'I', name: 'Output Variance Reduction',
    targetClusters: ['2B', '2H'],
    purpose: 'Standardizes top-performer technique to narrow the output gap between strongest and average performers.',
    typicalDuration: '4–8 weeks', reMeasureSchedule: '60 days',
  },

  // ===== POLICY PROTOCOLS (Chapter 39) =====
  {
    id: 'P-1', family: 'P', name: 'Decision Audit',
    targetClusters: ['1C'],
    purpose: 'Audits recent decisions against documented policy to find and address the root cause of divergence.',
    typicalDuration: '1–2 weeks', reMeasureSchedule: '30 days',
  },
  {
    id: 'P-2', family: 'P', name: 'Policy Compression',
    targetClusters: ['1B'],
    purpose: 'Retires or consolidates redundant, contradictory, or unused policies into a coherent set.',
    typicalDuration: '2–4 weeks', reMeasureSchedule: '60 days',
  },
  {
    id: 'P-3', family: 'P', name: 'Rule Harmonization',
    targetClusters: ['1F'],
    purpose: 'Resolves inconsistent interpretation of ambiguous policy across teams using shared test scenarios.',
    typicalDuration: '1–2 weeks', reMeasureSchedule: '30 days',
  },

  // ===== STRUCTURAL LAG PROTOCOLS (Chapter 40) =====
  {
    id: 'L-1', family: 'L', name: 'Shadow System Formalization',
    targetClusters: ['2D', '4B'],
    purpose: 'Converts informal workarounds that staff actually rely on into the official, formal process.',
    typicalDuration: '6–12 weeks', reMeasureSchedule: '90 days',
  },
  {
    id: 'L-2', family: 'L', name: 'Reconciliation Audit',
    targetClusters: ['2D', '4B'],
    purpose: 'Reconciles documented workflow against observed actual practice and updates whichever is wrong.',
    typicalDuration: '2–4 weeks', reMeasureSchedule: '60 days',
  },
  {
    id: 'L-3', family: 'L', name: 'Bottleneck Elimination',
    targetClusters: ['2G', '2H'],
    purpose: 'Identifies and fixes the specific handoffs or interfaces causing recurring rework.',
    typicalDuration: '2–6 weeks', reMeasureSchedule: '30 days',
  },
  {
    id: 'L-4', family: 'L', name: 'Structure Catch-Up Sprint',
    targetClusters: ['2A', '4D'],
    purpose: 'A time-boxed sprint to bring structural maturity back in line with organizational growth or complexity.',
    typicalDuration: '4–8 weeks', reMeasureSchedule: '90 days',
  },
];

export function getProtocol(id: string): ProtocolDefinition | undefined {
  return PROTOCOLS.find(p => p.id === id);
}

export function getProtocolsForCluster(clusterId: string): ProtocolDefinition[] {
  return PROTOCOLS.filter(p => p.targetClusters.includes(clusterId as any));
}

// Dependency Hierarchy ordering (Chapter 36 §36.3): G-1 → G-2 → P-1 → I-1 → I-3 → L-1
// Used to order recommended protocols when multiple are equally relevant in v1.
export const DEPENDENCY_HIERARCHY_ORDER: string[] = [
  'G-1', 'G-2', 'G-3', 'G-4', 'P-1', 'P-2', 'P-3', 'I-1', 'I-3', 'I-2', 'I-4', 'L-1', 'L-2', 'L-3', 'L-4',
];
