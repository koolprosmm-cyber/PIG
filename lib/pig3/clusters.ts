// lib/pig3/clusters.ts
//
// THE 29 PIG³ DIAGNOSTIC CLUSTERS
// Source: Chapter 9 (The 29 Diagnostic Clusters), Chapter 67 (Element Inventory)
//
// This replaces the original draft's 42-question, 7-dimension (PM-1...PM-7)
// model, which was not part of the PIG³ framework. The real framework has
// 3 pillars (Policy, Institutions, Governance) plus Cross-Cutting Variables,
// organized into 29 clusters as below.
//
// v1 ASSESSMENT NOTE: Each cluster below has ONE condensed diagnostic question
// for the MVP's lightweight 29-question assessment (one per cluster, per the
// product decision to defer the full 92-element / 90-Gold-Standard-Question
// version to v2). The question text is paraphrased from the cluster's real
// definition and diagnostic intent in Chapters 9 and 67 — it is not verbatim
// source text. ★ marks the 4 CRITICAL clusters called out in the Master Bible.

import { ClusterDefinition, ClusterId, ClusterCategory } from './types';

export const CLUSTERS: ClusterDefinition[] = [
  // ===== POLICY (1A–1G) — Chapter 9, §74.1 =====
  {
    id: '1A', category: 'Policy', name: 'Strategic Direction', critical: false,
    question: 'We have a clear, documented vision, mission, and set of strategic goals that people actually understand.',
  },
  {
    id: '1B', category: 'Policy', name: 'Policy Architecture', critical: false,
    question: 'Our policies form a coherent, accessible system, without significant gaps or contradictions.',
  },
  {
    id: '1C', category: 'Policy', name: 'Policy Alignment', critical: true,
    question: 'What actually happens in our organization closely matches what our written policies say.',
  },
  {
    id: '1D', category: 'Policy', name: 'Prioritization and Resources', critical: false,
    question: 'Our priorities are explicit, and our budget allocation actually reflects those priorities.',
  },
  {
    id: '1E', category: 'Policy', name: 'Action Plans', critical: false,
    question: 'Our plans have clear owners and timelines, and get updated based on real-world experience.',
  },
  {
    id: '1F', category: 'Policy', name: 'Policies and Rules', critical: false,
    question: 'Our rules are understood, consistently applied, and can be legitimately updated when they stop working.',
  },
  {
    id: '1G', category: 'Policy', name: 'External Policy Environment', critical: false,
    question: 'We are systematically aware of, and able to respond to, external laws and policy changes that affect us.',
  },

  // ===== INSTITUTIONS (2A–2J) — Chapter 9, §74.2 =====
  {
    id: '2A', category: 'Institutions', name: 'Organizational Structure', critical: false,
    question: 'Roles, responsibilities, and reporting lines are clearly defined, with no major gaps or overlaps.',
  },
  {
    id: '2B', category: 'Institutions', name: 'Staff Competency', critical: false,
    question: 'Our people have the knowledge, motivation, skills, and consistent habits needed to do their jobs well.',
  },
  {
    id: '2C', category: 'Institutions', name: 'Financial Capacity', critical: false,
    question: 'Our financial resources are sufficient, reasonably predictable, and well managed.',
  },
  {
    id: '2D', category: 'Institutions', name: 'Operational Systems', critical: false,
    question: 'Our core processes are documented, reliable, and actually followed in practice.',
  },
  {
    id: '2E', category: 'Institutions', name: 'Culture and Values in Practice', critical: true,
    question: 'People feel safe raising concerns and admitting mistakes, and our actions match our stated values.',
  },
  {
    id: '2F', category: 'Institutions', name: 'Internal Communication', critical: false,
    question: 'Information reaches the people who need it, including problems raised from the frontline upward.',
  },
  {
    id: '2G', category: 'Institutions', name: 'Coordination and Integration', critical: false,
    question: 'Departments and teams collaborate effectively rather than operating as disconnected silos.',
  },
  {
    id: '2H', category: 'Institutions', name: 'Execution Discipline', critical: false,
    question: 'We reliably deliver what we plan to deliver, on time and at consistent quality.',
  },
  {
    id: '2I', category: 'Institutions', name: 'Performance Monitoring and M&E', critical: false,
    question: 'We track meaningful performance indicators and actually use that data to change what we do.',
  },
  {
    id: '2J', category: 'Institutions', name: 'Stakeholder Engagement', critical: false,
    question: 'Our engagement with key stakeholders is substantive and influences decisions, not just symbolic.',
  },

  // ===== GOVERNANCE (3A–3H) — Chapter 9, §74.3 =====
  {
    id: '3A', category: 'Governance', name: 'Decision-Making', critical: false,
    question: 'Decision rights are clear, and decisions get made at the right level and in a timely way.',
  },
  {
    id: '3B', category: 'Governance', name: 'Accountability Mechanisms', critical: true,
    question: 'People — including leadership — are consistently held responsible for results, with real consequences.',
  },
  {
    id: '3C', category: 'Governance', name: 'Board Oversight', critical: false,
    question: 'Our governing or oversight body actively, independently, and substantively reviews performance.',
  },
  {
    id: '3D', category: 'Governance', name: 'Transparency', critical: false,
    question: 'Information about decisions, performance, and failures is shared openly with those who need it.',
  },
  {
    id: '3E', category: 'Governance', name: 'Rule of Law / Compliance', critical: false,
    question: 'Rules are enforced consistently, regardless of who is involved — including leadership.',
  },
  {
    id: '3F', category: 'Governance', name: 'Participation', critical: false,
    question: 'Participation in decision-making is genuine and affects outcomes, not just symbolic involvement.',
  },
  {
    id: '3G', category: 'Governance', name: 'Ethics', critical: false,
    question: 'Ethical standards are clearly defined, and leaders visibly model the standards they expect of others.',
  },
  {
    id: '3H', category: 'Governance', name: 'Governance Effectiveness', critical: false,
    question: 'Our governance demonstrably improves outcomes rather than mainly creating bureaucratic overhead.',
  },

  // ===== CROSS-CUTTING (4A–4F) — Chapter 9, §74.4 =====
  {
    id: '4A', category: 'CrossCutting', name: 'P-I-G Alignment', critical: true,
    question: 'Our Policy, Institutions, and Governance reinforce each other toward shared goals, rather than pulling in different directions.',
  },
  {
    id: '4B', category: 'CrossCutting', name: 'Friction Points', critical: false,
    question: 'There is little day-to-day friction where our policies, institutions, and governance block or undermine each other.',
  },
  {
    id: '4C', category: 'CrossCutting', name: 'Feedback Loops', critical: false,
    question: 'Information from frontline experience reaches decision-makers and reliably leads to a response.',
  },
  {
    id: '4D', category: 'CrossCutting', name: 'Resilience', critical: false,
    question: 'We have demonstrated the ability to absorb shocks (departures, funding gaps, crises) without breaking down.',
  },
  {
    id: '4E', category: 'CrossCutting', name: 'External Alignment', critical: false,
    question: 'Our overall organizational system genuinely fits our external environment (market, regulatory, cultural).',
  },
  {
    id: '4F', category: 'CrossCutting', name: 'PIG Voice', critical: false,
    question: 'If people described, in their own words, how this organization really works, that description would be positive.',
  },
];

export function getClustersByCategory(category: ClusterCategory): ClusterDefinition[] {
  return CLUSTERS.filter(c => c.category === category);
}

export function getCluster(id: ClusterId): ClusterDefinition {
  const cluster = CLUSTERS.find(c => c.id === id);
  if (!cluster) throw new Error(`Unknown cluster id: ${id}`);
  return cluster;
}

export const CLUSTER_ORDER: ClusterId[] = CLUSTERS.map(c => c.id);

export const CATEGORY_LABELS: Record<ClusterCategory, string> = {
  Policy: 'Policy',
  Institutions: 'Institutions',
  Governance: 'Governance',
  CrossCutting: 'Cross-Cutting Variables',
};
