// lib/pig3/knowledge.ts
//
// PIG³ KNOWLEDGE BASE (v1 seed set)
// Source: drawn from the actual PIG³ Master Bible (Chapters 1–67).
//
// v1 NOTE: This is a representative seed set, not the full Master Bible.
// A production RAG implementation should embed the complete 67-chapter
// source text (via the knowledge_base table + pgvector, as scaffolded in
// migrations.sql) rather than rely on this hardcoded array. Every entry
// below references a REAL chapter and REAL concept from the framework —
// none of the original draft's invented "PM-1...PM-7" content is retained.

export interface KnowledgeItem {
  id: string;
  chapter: string;
  section: string;
  title: string;
  content: string;
  keywords: string[];
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: 'KB-001',
    chapter: 'Chapter 1',
    section: 'The Master Formula Chain',
    title: 'What PIG³ Is',
    content:
      'PIG³ diagnoses organizational structural health using three interdependent pillars — Policy (P), Institutions (I), and Governance (G) — modified by Cross-Cutting Variables (CV), expressed as (P × I × G) ⊕ CV → HE. The pillars are multiplicative, not additive: weakness in any one pillar degrades the whole system.',
    keywords: ['pig3', 'framework', 'policy', 'institutions', 'governance', 'formula'],
  },
  {
    id: 'KB-002',
    chapter: 'Chapter 9',
    section: 'The 29 Diagnostic Clusters',
    title: 'How PIG³ Measures Structural Health',
    content:
      'PIG³ organizes 92 diagnostic elements into 29 clusters: 7 Policy clusters (1A–1G), 10 Institutions clusters (2A–2J), 8 Governance clusters (3A–3H), and 6 Cross-Cutting clusters (4A–4F). Four clusters are designated CRITICAL: 1C Policy Alignment, 2E Culture and Values in Practice, 3B Accountability Mechanisms, and 4A P-I-G Alignment.',
    keywords: ['clusters', 'elements', 'policy', 'institutions', 'governance', 'critical'],
  },
  {
    id: 'KB-003',
    chapter: 'Chapter 11',
    section: 'The Scoring Engine',
    title: 'PCI, IRI, GCI — The Three Diagnostic Indices',
    content:
      'The Policy Consistency Index (PCI), Institutional Repeatability Index (IRI), and Governance Clarity Index (GCI) are each calculated from weighted raw sub-variables specific to their pillar. All three run 0–100, where higher scores indicate greater health.',
    keywords: ['pci', 'iri', 'gci', 'index', 'scoring'],
  },
  {
    id: 'KB-004',
    chapter: 'Chapter 11 / 66',
    section: 'Structural Lag Index',
    title: 'SLI — Structural Lag Index',
    content:
      'Unlike PCI, IRI, and GCI, the Structural Lag Index (SLI) measures structural debt, not health — lower is better, with a target of SLI < 40. SLI is built from four sub-variables: Growth-Structure Mismatch Ratio, Shadow System Intensity, Formal vs. Actual Workflow Divergence, and Rework Rate.',
    keywords: ['sli', 'structural lag', 'structural debt', 'risk'],
  },
  {
    id: 'KB-005',
    chapter: 'Chapter 12',
    section: 'The 8 Organizational Profiles',
    title: 'Organizational Profiles (SSS through WWW)',
    content:
      'Each pillar (P, I, G) is classified Strong or Weak based on its Pillar Value, producing one of 8 three-letter profiles, from SSS (all pillars strong, fully aligned) to WWW (all pillars weak, crisis). The profile pattern reveals which kind of structural failure an organization is most exposed to.',
    keywords: ['profile', 'sss', 'www', 'classification'],
  },
  {
    id: 'KB-006',
    chapter: 'Chapter 14',
    section: 'State Classification',
    title: 'Organizational States',
    content:
      'Beyond the static profile, PIG³ classifies organizations into dynamic states — including CRITICAL — that combine pillar weakness with structural lag trends to indicate urgency of intervention, not just current condition.',
    keywords: ['state', 'critical', 'urgency', 'classification'],
  },
  {
    id: 'KB-007',
    chapter: 'Chapters 36–41',
    section: 'The 16 Intervention Protocols',
    title: 'The Protocol Catalog',
    content:
      'PIG³ defines 16 named intervention protocols across four families: Governance (G-1 to G-4), Institutions (I-1 to I-4), Policy (P-1 to P-3), and Structural Lag (L-1 to L-4). Each has defined triggers, completion criteria, escalation rules, a re-measurement schedule, and — for several — documented Policy Resistance patterns describing who is likely to resist the change and why.',
    keywords: ['protocol', 'intervention', 'governance', 'institutions', 'policy', 'structural lag'],
  },
  {
    id: 'KB-008',
    chapter: 'Chapter 36',
    section: 'The Dependency Hierarchy',
    title: 'Protocol Sequencing',
    content:
      'Protocols generally follow a Dependency Hierarchy: G-1 → G-2 → P-1 → I-1 → I-3 → L-1. Governance clarity (who decides, who is accountable) is generally addressed before institutional capacity-building, which in turn precedes structural-lag remediation. The Capacity Rule limits an organization to 2–3 concurrent protocols at a time.',
    keywords: ['dependency hierarchy', 'sequencing', 'capacity rule'],
  },
  {
    id: 'KB-009',
    chapter: 'Chapter 27',
    section: 'Policrastination',
    title: 'What Policrastination Is',
    content:
      'Policrastination is the organizational pattern of decision delay produced by structural weakness — not laziness or individual failure. It manifests as Policy-driven, Institution-driven, Governance-driven, or compound delay, each with a different root cause and remedy.',
    keywords: ['policrastination', 'delay', 'decision'],
  },
  {
    id: 'KB-010',
    chapter: 'Chapter 31',
    section: 'MASOSAI',
    title: 'Why Structural Gains Erode Without Maintenance',
    content:
      'The Memory Decay Formula shows that structural state decays roughly 5% per period without active maintenance. This is why every protocol includes a Sustaining Requirement — without it, even a successful intervention reverts within months.',
    keywords: ['memory decay', 'sustaining', 'masosai', 'erosion'],
  },
  {
    id: 'KB-011',
    chapter: 'Chapter 62',
    section: 'The Ongoing Cadence',
    title: 'How Often to Reassess',
    content:
      'PIG³ recommends a layered assessment cadence: weekly progress checks during active intervention, monthly reviews, quarterly pulse checks, and a full annual diagnostic — plus triggered reassessment after major growth, a key leader departure, or a strategic pivot.',
    keywords: ['cadence', 'reassessment', 'monitoring', 'frequency'],
  },
];

export function searchKnowledge(query: string): KnowledgeItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  return KNOWLEDGE_BASE
    .map(item => {
      let score = 0;
      words.forEach(word => {
        if (item.keywords.some(k => k.includes(word) || word.includes(k))) score += 2;
        if (item.content.toLowerCase().includes(word)) score += 1;
        if (item.title.toLowerCase().includes(word)) score += 3;
      });
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
