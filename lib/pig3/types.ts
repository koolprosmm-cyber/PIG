// lib/pig3/types.ts
//
// PIG³ TYPES — aligned to the actual PIG³ Master Bible (Chapters 1–67).
//
// IMPORTANT: This replaces an earlier draft that used an invented "PM-1...PM-7"
// 7-dimension model (Policy/Structure/Culture/Capability/Strategy/Implementation/
// Resources). That model does not exist anywhere in the real PIG³ framework and
// has been fully removed. The real architecture is:
//
//   3 Pillars: Policy (P), Institutions (I), Governance (G)
//   + Cross-Cutting Variables (CV) — Clusters 4A–4F
//   = 29 total diagnostic clusters (Chapter 9)
//   → 4 diagnostic indices: PCI, IRI, GCI, SLI (Chapter 11, 66)
//   → 8 organizational profiles: SSS through WWW (Chapter 12)
//   → State classification: SSS / WSW / WWW / CRITICAL (Chapter 14)

// --- Pillars ---

export type Pillar = 'P' | 'I' | 'G';

// --- The 29 Clusters ---
// Source: Chapter 9 (The 29 Diagnostic Clusters), Chapter 67 (Element Inventory)

export type PolicyClusterId = '1A' | '1B' | '1C' | '1D' | '1E' | '1F' | '1G';
export type InstitutionsClusterId =
  | '2A' | '2B' | '2C' | '2D' | '2E' | '2F' | '2G' | '2H' | '2I' | '2J';
export type GovernanceClusterId =
  | '3A' | '3B' | '3C' | '3D' | '3E' | '3F' | '3G' | '3H';
export type CrossCuttingClusterId = '4A' | '4B' | '4C' | '4D' | '4E' | '4F';

export type ClusterId =
  | PolicyClusterId
  | InstitutionsClusterId
  | GovernanceClusterId
  | CrossCuttingClusterId;

export type ClusterCategory = 'Policy' | 'Institutions' | 'Governance' | 'CrossCutting';

export interface ClusterDefinition {
  id: ClusterId;
  category: ClusterCategory;
  name: string;
  critical: boolean; // ★ CRITICAL clusters per Chapter 9/67
  question: string;  // condensed diagnostic question for the v1 lightweight assessment
}

// --- Raw cluster answers (v1: one 1–5 answer per cluster) ---
//
// v1 SIMPLIFICATION NOTE: The canonical PIG³ indices (PCI, IRI, GCI) are defined
// in Chapter 11/66 from named raw sub-variables (e.g., P1 Decision-Rule Adherence
// Rate, I1 Bus Factor, G1 Decision Ownership Clarity Rate) — NOT directly from
// cluster-level Likert scores. Collecting those raw sub-variables requires
// operational data (e.g., "how many people could run this process alone?"),
// which v1 defers. For v1, each cluster is scored with a single 1–5 self-report
// answer, and the index formulas below are fed by cluster averages as a stated
// approximation of the canonical formulas — not the canonical formulas themselves.
// This must be clearly surfaced to users (see ScoringDisclaimer) and should be
// replaced with true sub-variable collection in v2.

export interface ClusterAnswer {
  clusterId: ClusterId;
  value: number; // 1–5
}

// --- Diagnostic Indices ---
// Canonical source: Chapter 11 (Scoring Engine), Chapter 66 (Formula Reference)
// PCI, IRI, GCI: 0–100, higher = healthier.
// SLI: 0–100, LOWER = healthier (it measures structural debt, not health).

export interface DiagnosticIndices {
  pci: number; // Policy Consistency Index (from Policy clusters 1A–1G, v1 approximation)
  iri: number; // Institutional Repeatability Index (from Institutions clusters 2A–2J, v1 approximation)
  gci: number; // Governance Clarity Index (from Governance clusters 3A–3H, v1 approximation)
  sli: number; // Structural Lag Index (from Cross-Cutting clusters 4A–4F, v1 approximation — see note in scoring.ts)
}

// --- Pillar Values (1–5 scale) ---
// Source: Chapter 66, §66.4 — Pillar Value Conversion
// Pillar Value (1–5) = 1 + (Index ÷ 100 × 4)

export interface PillarValues {
  pValue: number;
  iValue: number;
  gValue: number;
}

export type SWMClassification = 'S' | 'M' | 'W'; // Strong / Moderate(transitional) / Weak
// Thresholds (Chapter 66 §66.4): >= 3.5 => S, 3.0–3.4 => M, < 3.0 => W

export interface PillarClassification {
  p: SWMClassification;
  i: SWMClassification;
  g: SWMClassification;
}

// --- The 8 Organizational Profiles ---
// Source: Chapter 12. Profile code = P-I-G classification using only S/W
// (the "M" transitional band resolves to nearest S/W for profile-coding purposes,
// consistent with Chapter 12's 8-profile — not 27-profile — system).

export type ProfileCode =
  | 'SSS' | 'SSW' | 'SWS' | 'WSS'
  | 'SWW' | 'WSW' | 'WWS' | 'WWW';

export interface ProfileResult {
  code: ProfileCode;
  name: string; // e.g., "Aligned", "Paper Tiger", "Lost Army" — common Master Bible names
  description: string;
}

// --- State Classification ---
// Source: Chapter 14. Universal states: SSS, WSW, WWW, CRITICAL.
// (Chapter 14 also defines public/NGO-specific states — AAA, WARNING, FRAGILE,
// ZOMBIE, CRITICAL ZOMBIE — which are deferred to v2 sector-specific variants.)

export type StateCode = 'SSS' | 'WSW' | 'WWW' | 'CRITICAL';

export interface StateResult {
  code: StateCode;
  urgency: 'Low' | 'Moderate' | 'High' | 'Severe';
  description: string;
}

// --- Composite Indices (subset; Chapter 66 §66.4) ---

export interface CompositeIndices {
  bpi: number; // Business Performance Index, 1.0–5.0 — (P+I+G)/3
  bas: number; // Balance Score, 1.0–5.0 — 5 - STDEV(P,I,G)
  bfs: number; // Friction Score, 0–4, LOWER is better
}

// --- Full Assessment Result ---

export interface AssessmentResult {
  clusterAnswers: ClusterAnswer[];
  indices: DiagnosticIndices;
  pillarValues: PillarValues;
  pillarClassification: PillarClassification;
  profile: ProfileResult;
  state: StateResult;
  composite: CompositeIndices;
}

// --- Protocols ---
// Source: Chapters 36–41. 16 named protocols across 4 families.

export type ProtocolFamily = 'G' | 'I' | 'P' | 'L'; // Governance / Institutions / Policy / Structural Lag

export type ProtocolId =
  | 'G-1' | 'G-2' | 'G-3' | 'G-4'
  | 'I-1' | 'I-2' | 'I-3' | 'I-4'
  | 'P-1' | 'P-2' | 'P-3'
  | 'L-1' | 'L-2' | 'L-3' | 'L-4';

export interface ProtocolDefinition {
  id: ProtocolId;
  family: ProtocolFamily;
  name: string;
  targetClusters: ClusterId[]; // which clusters this protocol primarily addresses
  purpose: string;
  typicalDuration: string;
  reMeasureSchedule: string;
}

// v1 recommendation shape: clusters ranked by weakness, linked to relevant
// protocol(s). No trigger-threshold evaluation (that requires the real raw
// sub-variables deferred in this version) — see recommendations.ts.

export interface ClusterPriority {
  clusterId: ClusterId;
  clusterName: string;
  category: ClusterCategory;
  score: number; // 1–5, this cluster's raw answer
  critical: boolean;
  relatedProtocols: ProtocolDefinition[];
}

export interface RecommendationResult {
  rankedPriorities: ClusterPriority[]; // weakest first
  topProtocols: ProtocolDefinition[]; // de-duplicated, ordered by Dependency Hierarchy where possible
}

// --- Org / User (unchanged structurally from original draft) ---

export interface Organization {
  id: string;
  name: string;
  industry: string;
  size: string;
  stage: string;
  createdAt: Date;
}

export interface User {
  id: string;
  clerkId: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'manager' | 'staff';
  organizationId: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
