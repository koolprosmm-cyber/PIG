// lib/pig3/recommendations.ts
//
// PIG³ RECOMMENDATIONS — v1 (ranked-weakness model)
//
// v1 DESIGN NOTE: The real Protocol Trigger Matrix (Chapter 36 §36.2)
// evaluates specific numeric thresholds against raw sub-variables (e.g.,
// "Activate G-2 if Escalation Frequency > 20%"). Since v1 only collects
// cluster-level 1–5 answers (no raw sub-variables), we cannot honestly
// evaluate those real triggers. Per product decision, v1 does NOT simulate
// or approximate trigger-threshold logic. Instead, it:
//   1. Ranks all 29 clusters from weakest to strongest,
//   2. Flags which ranked clusters are ★ CRITICAL,
//   3. Links each weak cluster to its real, relevant protocol(s) from the
//      Chapter 36–41 catalog — as a relevance mapping, not a fired trigger.
// This keeps v1 honest: it tells the user "this cluster is weak, and here is
// the protocol that addresses it" without pretending to know precise
// numeric trigger conditions it has no data to evaluate.

import { ClusterAnswer, ClusterPriority, RecommendationResult } from './types';
import { CLUSTERS } from './clusters';
import { getProtocolsForCluster, DEPENDENCY_HIERARCHY_ORDER } from './protocols';

export function rankClusterPriorities(answers: ClusterAnswer[]): ClusterPriority[] {
  const priorities: ClusterPriority[] = CLUSTERS.map(cluster => {
    const answer = answers.find(a => a.clusterId === cluster.id);
    const score = answer ? answer.value : 0;
    return {
      clusterId: cluster.id,
      clusterName: cluster.name,
      category: cluster.category,
      score,
      critical: cluster.critical,
      relatedProtocols: getProtocolsForCluster(cluster.id),
    };
  });

  // Weakest first. Tie-break: CRITICAL clusters surface above non-critical
  // at the same score, since Chapter 9 treats ★ clusters as higher-impact.
  return priorities.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    return 0;
  });
}

export function getTopProtocols(rankedPriorities: ClusterPriority[], limit: number = 5) {
  const seen = new Set<string>();
  const collected: RecommendationResult['topProtocols'] = [];

  // Walk weakest-first clusters, collecting their protocols until we hit the limit.
  for (const priority of rankedPriorities) {
    if (priority.score === 0) continue; // unanswered
    if (priority.score >= 4) break; // only pull protocols for genuinely weak clusters (1-3)
    for (const protocol of priority.relatedProtocols) {
      if (!seen.has(protocol.id)) {
        seen.add(protocol.id);
        collected.push(protocol);
      }
      if (collected.length >= limit) break;
    }
    if (collected.length >= limit) break;
  }

  // Order the collected set by the real Dependency Hierarchy (Chapter 36 §36.3)
  // so governance-layer fixes are presented before downstream ones.
  return collected.sort(
    (a, b) => DEPENDENCY_HIERARCHY_ORDER.indexOf(a.id) - DEPENDENCY_HIERARCHY_ORDER.indexOf(b.id)
  );
}

export function generateRecommendations(answers: ClusterAnswer[]): RecommendationResult {
  const rankedPriorities = rankClusterPriorities(answers);
  const topProtocols = getTopProtocols(rankedPriorities);
  return { rankedPriorities, topProtocols };
}

/**
 * Plain-language executive summary. Honest about the v1 approximation —
 * does not claim more precision than the underlying data supports.
 */
export function generateExecutiveSummary(
  organizationName: string,
  pci: number,
  iri: number,
  gci: number,
  sli: number,
  profileCode: string,
  profileName: string,
  stateDescription: string,
  rec: RecommendationResult
): string {
  const weakest = rec.rankedPriorities.slice(0, 3);
  const strongest = [...rec.rankedPriorities].reverse().slice(0, 3);

  const weakestLines = weakest
    .map(c => `- ${c.clusterId} ${c.clusterName}${c.critical ? ' ★' : ''}: ${c.score}/5`)
    .join('\n');
  const strongestLines = strongest
    .map(c => `- ${c.clusterId} ${c.clusterName}${c.critical ? ' ★' : ''}: ${c.score}/5`)
    .join('\n');
  const protocolLines = rec.topProtocols
    .map((p, idx) => `${idx + 1}. ${p.id} ${p.name} — ${p.purpose}`)
    .join('\n');

  return `
EXECUTIVE SUMMARY
${organizationName}
${new Date().toISOString().split('T')[0]}

─────────────────────────────────────────────
PROFILE: ${profileCode} (${profileName})
${stateDescription}

DIAGNOSTIC INDICES (v1 cluster-level approximation — see methodology note)
  PCI (Policy):       ${pci}/100
  IRI (Institutions): ${iri}/100
  GCI (Governance):   ${gci}/100
  SLI (Structural Lag, lower is better): ${sli}/100

─────────────────────────────────────────────
LOWEST-SCORING CLUSTERS:
${weakestLines}

HIGHEST-SCORING CLUSTERS:
${strongestLines}

─────────────────────────────────────────────
RELEVANT PROTOCOLS (ranked by structural dependency, not by fired trigger —
v1 does not yet evaluate the real numeric trigger thresholds):
${protocolLines}

─────────────────────────────────────────────
This is a v1 lightweight assessment based on 29 cluster-level self-report
answers, not the full PIG³ 92-element diagnostic. Treat results as directional.

Generated by the PIG³ Organizational Health Platform
  `.trim();
}
