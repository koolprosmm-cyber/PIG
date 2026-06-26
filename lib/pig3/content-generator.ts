// lib/pig3/content-generator.ts
//
// CONTENT GENERATION LAYER — converts PIG³ diagnostic outputs into
// organizational documents (policies, strategy, SOPs, HR guidelines, AI
// governance, implementation manuals, executive summaries). Deterministic,
// template-based, no AI dependency.
//
// CORRECTED VERSION: an earlier draft of this file was built entirely
// against the invented "PM-1...PM-7" model (scores.pm1, scores.overallHealth,
// scores.trafficLight, a nonexistent './questions' module) that does not
// exist in the real PIG³ framework — see lib/pig3/types.ts header. This
// version is rewritten against the REAL types: AssessmentResult (with
// nested indices.pci/iri/gci/sli, pillarValues, profile, state) and
// RecommendationResult (rankedPriorities + topProtocols), sourced from
// clusters.ts and protocols.ts.
//
// v1 APPROXIMATION DISCLOSURE: every generated document that cites
// PCI/IRI/GCI/SLI carries the same v1-approximation disclosure used
// elsewhere in the app (see ScoringDisclaimer.tsx, scoring.ts header).
// These are real, organization-facing documents — presenting an
// approximated number as precise here is a bigger-stakes version of the
// problem ScoringDisclaimer already exists to prevent on the dashboard.

import { AssessmentResult, RecommendationResult, ClusterPriority, ProtocolDefinition } from './types';
import { CATEGORY_LABELS } from './clusters';

// ─── Document Types ────────────────────────────────────────────────
export type ContentType =
  | 'policy'
  | 'strategy'
  | 'sop'
  | 'hr_guidelines'
  | 'ai_governance'
  | 'implementation_manual'
  | 'executive_summary';

export interface ContentRequest {
  type: ContentType;
  result: AssessmentResult;
  recommendations: RecommendationResult;
  organizationName: string;
  industry?: string;
  size?: string;
}

// ─── Shared disclosure block ───────────────────────────────────────
const V1_DISCLOSURE =
  '> **Methodology note:** PCI, IRI, GCI, and SLI in this document are v1 lightweight ' +
  'approximations — one self-report score per cluster, averaged per pillar — not the ' +
  'canonical PIG³ Master Bible formulas (Chapter 66), which require operational ' +
  'sub-variable data this assessment does not yet collect. Treat figures below as ' +
  'directional, not precise, until a full diagnostic is conducted.';

// ─── Shared classification helpers (matches HealthScoreCard.tsx thresholds) ──
type Band = 'Strong' | 'Moderate' | 'Critical';

function bandForIndex(value: number, inverse = false): Band {
  const healthy = inverse ? value < 40 : value >= 70;
  const moderate = inverse ? value >= 40 && value < 55 : value >= 50 && value < 70;
  if (healthy) return 'Strong';
  if (moderate) return 'Moderate';
  return 'Critical';
}

function bandEmoji(band: Band): string {
  return band === 'Strong' ? '✅' : band === 'Moderate' ? '⚠️' : '🚨';
}

// ─── Shared: format weak clusters relevant to a category ───────────
function weakClustersFor(rankedPriorities: ClusterPriority[], category: ClusterPriority['category']): ClusterPriority[] {
  return rankedPriorities.filter(c => c.category === category && c.score > 0 && c.score < 3);
}

function formatClusterList(clusters: ClusterPriority[]): string {
  if (clusters.length === 0) return '';
  return clusters.map(c => `- **${c.clusterId} ${c.clusterName}${c.critical ? ' ★' : ''}** — scored ${c.score}/5`).join('\n');
}

// ─── Shared: protocols relevant to a category, deduplicated ────────
function protocolsForCategory(rankedPriorities: ClusterPriority[], category: ClusterPriority['category']): ProtocolDefinition[] {
  const seen = new Set<string>();
  const result: ProtocolDefinition[] = [];
  weakClustersFor(rankedPriorities, category).forEach(c => {
    c.relatedProtocols.forEach(p => {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    });
  });
  return result;
}

function formatProtocolList(protocols: ProtocolDefinition[]): string {
  if (protocols.length === 0) return '';
  return protocols
    .map(p => `- **${p.id} — ${p.name}**: ${p.purpose} (Typical duration: ${p.typicalDuration}; re-measure at ${p.reMeasureSchedule})`)
    .join('\n');
}

const dateStamp = () => new Date().toISOString().split('T')[0];

// ─── Document Generators ───────────────────────────────────────────

function generatePolicyDocument(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const pci = result.indices.pci;
  const band = bandForIndex(pci);
  const weak = weakClustersFor(recommendations.rankedPriorities, 'Policy');
  const protocols = protocolsForCategory(recommendations.rankedPriorities, 'Policy');

  return `# POLICY MANUAL — ${organizationName}
## Organizational Policy Framework

${V1_DISCLOSURE}

### Assessment Context
Based on the PIG³ Organizational Health Assessment conducted on [Date], the Policy Consistency Index (PCI) for ${organizationName} is **${pci}/100** (${bandEmoji(band)} ${band}).

${weak.length > 0
    ? `The following Policy clusters (Chapter 9, §74.1) scored below 3/5 and require attention:\n${formatClusterList(weak)}`
    : 'No Policy clusters scored in the weak range (below 3/5) on this assessment.'}

---

## 1. Policy Hierarchy & Architecture
${band === 'Critical'
    ? '### 🚨 Critical Gap: Fragmented Policy System\nYour PCI score suggests policy structures are likely fragmented or inconsistently followed. This section establishes a clear hierarchy from strategic policy to operational SOPs.\n\n**Recommended structure:**\n1. **Strategic Policies** — Board-approved, reviewed annually\n2. **Operational Policies** — Department-level, reviewed quarterly\n3. **Standard Operating Procedures (SOPs)** — Task-level, reviewed monthly\n\n**Immediate actions:**\n- Appoint a Policy Officer\n- Create a centralized policy repository\n- Conduct a policy audit within 30 days'
    : band === 'Moderate'
    ? '### ⚠️ Moderate Gaps\nYour policy system is functional but likely has inconsistencies. Consolidate overlapping policies and ensure all critical areas are covered.\n\n**Actions:**\n- Identify and retire unused policies\n- Standardize policy formats across departments\n- Implement a quarterly policy review cycle'
    : '### ✅ Strong Policy Architecture\nYour policy system appears well-structured. Maintain through regular reviews and ensure accessibility for all staff.'}

## 2. Policy Alignment (Stated vs. Actual)
${recommendations.rankedPriorities.find(c => c.clusterId === '1C')
    ? `Cluster **1C Policy Alignment ★** (a CRITICAL cluster per Chapter 9) scored ${recommendations.rankedPriorities.find(c => c.clusterId === '1C')!.score}/5 on this assessment. ${
        recommendations.rankedPriorities.find(c => c.clusterId === '1C')!.score < 3
          ? 'This indicates a likely gap between stated policy and actual practice.\n\n**Interventions:**\n- P-1 Decision Audit: Map actual decision rules against written policy\n- P-2 Policy Compression: Simplify and consolidate where policy has become unworkable\n- Implement exception logging with manager review'
          : 'This suggests policy alignment is reasonably healthy on this dimension. Continue monitoring for drift.'
      }`
    : 'Cluster 1C Policy Alignment was not scored in this assessment.'}

## 3. Rules & Compliance
${weak.some(c => c.clusterId === '1F')
    ? 'Cluster **1F Policies and Rules** scored in the weak range. Rule enforcement may be inconsistent. **Establish:**\n- Clear consequences for non-compliance\n- Regular policy communication (monthly updates)\n- Onboarding module on key policies'
    : 'No specific weakness flagged in rule enforcement (cluster 1F) on this assessment.'}

## 4. Recommended Protocols
${protocols.length > 0
    ? `Based on weak Policy clusters identified above, the following PIG³ protocols (Chapters 36–41) are relevant:\n${formatProtocolList(protocols)}`
    : 'No Policy-family protocols (P-1, P-2, P-3) are indicated based on current scores. Schedule next review in 12 months.'}

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateStrategyDocument(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const { pci, sli } = result.indices;
  const pciBand = bandForIndex(pci);
  const sliBand = bandForIndex(sli, true);
  const protocols = recommendations.topProtocols;

  return `# STRATEGIC PLAN — ${organizationName}
## Organizational Strategy & Direction

${V1_DISCLOSURE}

### Diagnostic Summary
- **Profile:** ${result.profile.code} (${result.profile.name}) — ${result.profile.description}
- **State:** ${result.state.code}, ${result.state.urgency} urgency — ${result.state.description}
- **Policy Consistency (PCI):** ${pci}/100 (${pciBand})
- **Structural Lag (SLI, lower is better):** ${sli}/100 (${sliBand})

${result.state.urgency === 'Severe'
    ? '### 🚨 Urgent Strategic Reset Required\nThis organization\'s state classification indicates severe structural risk. The current strategy may not be executable given institutional capacity. Strategic decisions should be sequenced behind the Dependency Hierarchy (Chapter 36 §36.3) — governance and policy fixes typically precede new strategic initiatives.'
    : result.state.urgency === 'High'
    ? '### ⚠️ Strategic Refinement Needed\nStrategy is likely functional but requires sharper focus and better alignment with current institutional capacity.'
    : '### ✅ Strategic Health Reasonable\nNo severe structural blockers identified. Focus on execution and continuous monitoring (Chapter 62, The Ongoing Cadence).'}

## 1. Strategic Direction
${pciBand === 'Critical'
    ? '**Observation:** PCI score suggests strategic direction may be unclear or inconsistently communicated across departments.\n\n**Recommendation:**\n- Conduct a strategic clarity session within 30 days\n- Define 3–5 measurable strategic goals for the next 12 months\n- Align budget with stated priorities\n- Communicate strategy through all-hands and team cascades'
    : pciBand === 'Moderate'
    ? '**Recommendation:**\n- Review and refine strategic priorities\n- Ensure department goals align with organizational strategy\n- Implement quarterly strategy reviews'
    : '**Recommendation:** Maintain strategic clarity. Continue quarterly reviews.'}

## 2. Execution Capacity vs. Structural Lag
${sliBand === 'Critical'
    ? `**Warning:** Structural Lag Index is ${sli}/100, in the critical range. Strategic ambition may exceed institutional capacity. Before launching new initiatives, address structural gaps.\n\n**Immediate actions:**\n- Pause non-essential growth\n- Strengthen operational systems (I-3 Documentation Remediation, I-4 Output Variance Reduction)\n- Cross-train critical roles (I-1 Bus Factor Cross-Training)`
    : sliBand === 'Moderate'
    ? '**Caution:** Structural lag is accumulating. Balance strategic ambition with capacity building before committing to aggressive growth targets.'
    : '**Reasonable:** Structural capacity appears to be keeping pace with strategic ambition based on this assessment.'}

## 3. Recommended Protocols
${protocols.length > 0
    ? formatProtocolList(protocols)
    : '- No protocols are currently indicated. Maintain the standard assessment cadence (Chapter 62).'}

## 4. Success Indicators (v1 approximation — see disclosure above)
- PCI improvement to ≥70/100 within 6 months
- SLI reduction to <40/100 within 12 months
- No CRITICAL clusters (1C, 2E, 3B, 4A) scoring below 3/5 at next assessment

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateSOPDocument(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const iri = result.indices.iri;
  const sli = result.indices.sli;
  const iriBand = bandForIndex(iri);
  const weak = weakClustersFor(recommendations.rankedPriorities, 'Institutions');
  const protocols = protocolsForCategory(recommendations.rankedPriorities, 'Institutions');

  return `# STANDARD OPERATING PROCEDURES (SOPs) — ${organizationName}
## Operational Process Documentation

${V1_DISCLOSURE}

### Assessment Context
- **Institutional Repeatability Index (IRI):** ${iri}/100 (${iriBand})
- **Structural Lag Index (SLI):** ${sli}/100
- **Operational Systems cluster (2D):** ${recommendations.rankedPriorities.find(c => c.clusterId === '2D')?.score ?? 'not scored'}/5

${iriBand === 'Critical'
    ? '### 🚨 Critical: Processes May Depend on Individuals\nYour IRI score suggests core workflows may exist only informally. When key staff leave, operational knowledge may leave with them.\n\n**Indicated protocol: I-3 Documentation Remediation**'
    : iriBand === 'Moderate'
    ? '### ⚠️ Moderate Gaps\nSome processes are likely documented but not consistently followed, or documentation may be outdated.'
    : '### ✅ Reasonable Documentation\nProcesses appear reasonably well-documented based on this assessment.'}

## 1. Core Process Inventory — Clusters Requiring Attention
${weak.length > 0
    ? `The following Institutions clusters (Chapter 9, §74.2) scored below 3/5:\n${formatClusterList(weak)}`
    : 'No Institutions clusters scored in the weak range on this assessment.'}

## 2. SOP Template
### [Process Name]
- **Owner:** [Name/Role]
- **Frequency:** [Daily/Weekly/Monthly]
- **Prerequisites:** [Tools, Access, Approvals]
- **Procedure:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Decision Points:**
  - If [condition], then [action]
  - If [condition], escalate to [role]
- **Quality Check:** [How to verify completion]
- **Related Documents:** [Links]

## 3. Recommended Protocols
${protocols.length > 0
    ? `Based on weak Institutions clusters identified above:\n${formatProtocolList(protocols)}`
    : 'No Institution-family protocols (I-1 through I-4) are currently indicated. Schedule next review in 6 months.'}

## 4. Governance of This Document
- All SOPs must be reviewed and approved by the process owner and department head
- Changes to SOPs require a version update and communication to affected staff
- Quarterly health check: each process owner confirms documentation is current

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateHRGuidelines(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const iri = result.indices.iri;
  const gci = result.indices.gci;
  const cultureCluster = recommendations.rankedPriorities.find(c => c.clusterId === '2E');
  const cultureWeak = cultureCluster !== undefined && cultureCluster.score > 0 && cultureCluster.score < 3;

  return `# HUMAN RESOURCES GUIDELINES — ${organizationName}
## People Strategy & Organizational Health

${V1_DISCLOSURE}

### Diagnostic Context
- **Institutional Repeatability (IRI):** ${iri}/100 (${bandForIndex(iri)})
- **Governance Clarity (GCI):** ${gci}/100 (${bandForIndex(gci)})
- **2E Culture and Values in Practice ★** (CRITICAL cluster, Chapter 9): ${cultureCluster?.score ?? 'not scored'}/5

${bandForIndex(iri) === 'Critical' || bandForIndex(gci) === 'Critical'
    ? '### ⚠️ Structural Issues Likely Affecting HR\nThe diagnostic reveals structural weaknesses that may directly impact people management:'
    : '### ✅ Structural Foundation for HR Appears Reasonable\nNo critical structural blockers to people practices identified.'}

## 1. Workforce Planning & Capacity
${bandForIndex(iri) !== 'Strong'
    ? `**Observation:** Institutional capacity may be weak (IRI ${iri}/100). Key-person dependencies and slow onboarding are common at this level.\n\n**Recommendations:**\n- Conduct a skills audit to identify critical gaps\n- Implement cross-training (I-1 Bus Factor Cross-Training)\n- Accelerate onboarding (I-2 Onboarding Acceleration)\n- Review succession plans for all critical roles`
    : '**Recommendation:** Maintain workforce planning. Review annually.'}

## 2. Performance Management & Accountability
${recommendations.rankedPriorities.find(c => c.clusterId === '3B')
    ? `Cluster **3B Accountability Mechanisms ★** (CRITICAL, Chapter 9) scored ${recommendations.rankedPriorities.find(c => c.clusterId === '3B')!.score}/5. ${
        recommendations.rankedPriorities.find(c => c.clusterId === '3B')!.score < 3
          ? 'This suggests accountability mechanisms may be unclear or unenforced.\n\n**Recommendations:**\n- Assign single owners for all key goals (G-1 Ownership Assignment)\n- Rebuild traceability between missed goals and responsible individuals (G-3 Accountability Reconstruction)\n- Ensure accountability applies equally at all levels'
          : 'This suggests accountability mechanisms are reasonably healthy. Continue calibration across departments.'
      }`
    : 'Cluster 3B Accountability Mechanisms was not scored in this assessment.'}

## 3. Culture & Psychological Safety
${cultureWeak
    ? `**Observation:** Cluster 2E (Culture and Values in Practice) scored in the weak range. This is one of four CRITICAL clusters in the framework, with outsized systemic impact.\n\n**Recommendations:**\n- Conduct an anonymous psychological safety survey\n- Train managers on creating safe environments for raising concerns\n- Establish clear feedback channels\n- Address any gap between stated values and actual behavior visibly and promptly`
    : '**Recommendation:** Maintain healthy culture. Conduct regular pulse surveys.'}

## 4. Recommended Protocols
${recommendations.topProtocols.filter(p => p.family === 'G' || p.family === 'I').length > 0
    ? formatProtocolList(recommendations.topProtocols.filter(p => p.family === 'G' || p.family === 'I'))
    : '- No Governance- or Institution-family protocols currently indicated.'}

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateAIGovernanceDocument(req: ContentRequest): string {
  const { result, organizationName } = req;
  const gci = result.indices.gci;
  const sli = result.indices.sli;
  const gciBand = bandForIndex(gci);

  return `# AI GOVERNANCE FRAMEWORK — ${organizationName}
## Organizational AI Structure & Oversight

${V1_DISCLOSURE}

### Structural Context
- **Governance Clarity Index (GCI):** ${gci}/100 (${gciBand})
- **Structural Lag Index (SLI):** ${sli}/100
- **3A Decision-Making:** ${result.clusterAnswers.find(a => a.clusterId === '3A')?.value ?? 'not scored'}/5

${gciBand === 'Critical'
    ? '🚨 Governance structures appear weak. Before implementing AI governance, strengthen foundational governance (G-1 Ownership Assignment, G-2 Escalation Compression).'
    : gciBand === 'Moderate'
    ? '⚠️ Governance has moderate gaps. Address these before or alongside AI governance implementation.'
    : '✅ Governance foundation appears adequate for AI governance deployment.'}

## 1. AI Ethics & Policy
- Establish an AI Ethics Committee reporting to the Board
- Define acceptable-use policies for AI tools
- Ensure transparency: all AI-assisted decisions must be explainable
- Conduct bias audits on AI systems on a regular schedule
- Maintain human-in-the-loop review for high-stakes decisions

## 2. Data Governance
- Classify data by sensitivity (public, internal, confidential, restricted)
- Implement data access controls based on role and need
- Ensure compliance with applicable regulations (GDPR, CCPA, etc.)
- Establish data retention and deletion policies

## 3. AI System Inventory & Risk Management
- Maintain a register of all AI systems in use
- Conduct risk assessments for each system (low, medium, high, critical)
- Define escalation paths for AI-related incidents
- Schedule regular security review of AI-integrated systems

## 4. Organizational Structure for AI
- **AI Steering Committee:** Cross-functional governance, reporting through the same decision-rights structure assessed in cluster 3A
- **AI Ethics Review:** Independent review of high-risk applications
- **Data Stewards:** Operational data quality and compliance ownership

## 5. Monitoring & Accountability
${gciBand !== 'Strong'
    ? '**Recommendation:** Strengthen accountability before deploying AI systems. Consider G-1 (Ownership Assignment) and G-3 (Accountability Reconstruction) protocols first — AI governance built on weak underlying governance tends to be governance theater.'
    : '**Recommendation:** Tie AI governance metrics to existing performance management and accountability systems.'}

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateImplementationManual(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const { pci, iri, gci, sli } = result.indices;

  return `# IMPLEMENTATION MANUAL — ${organizationName}
## PIG³ Structural Intervention Guide

${V1_DISCLOSURE}

### Diagnostic Baseline
- **Profile:** ${result.profile.code} (${result.profile.name})
- **State:** ${result.state.code}, ${result.state.urgency} urgency
- **Policy (PCI):** ${pci}/100
- **Institutions (IRI):** ${iri}/100
- **Governance (GCI):** ${gci}/100
- **Structural Lag (SLI):** ${sli}/100

---

## 1. Intervention Sequence
Per the Dependency Hierarchy (Chapter 36, §36.3 — generally Governance → Policy → Institutions → Structural Lag), the following protocols are indicated by this assessment's weakest clusters, in recommended order:

${recommendations.topProtocols.length > 0
    ? recommendations.topProtocols
        .map(
          (p, idx) => `### ${idx + 1}. ${p.id} — ${p.name}
- **Family:** ${p.family === 'G' ? 'Governance' : p.family === 'I' ? 'Institutions' : p.family === 'P' ? 'Policy' : 'Structural Lag'}
- **Purpose:** ${p.purpose}
- **Typical Duration:** ${p.typicalDuration}
- **Re-Measure Schedule:** ${p.reMeasureSchedule}
- **Full Procedure:** Refer to PIG³ Master Bible, Chapters 37–40, for complete step-by-step instructions, completion criteria, and escalation rules.
`
        )
        .join('\n')
    : 'No specific protocols are currently triggered by this assessment. Maintain the standard monitoring cadence (Chapter 62).'}

## 2. Capacity Rule (Chapter 36, §36.6)
**Never run more than 2–3 protocols simultaneously.** If more than 3 protocols are listed above, sequence them rather than attempting all at once — concurrent overload is one of the most common causes of protocol abandonment.

## 3. Cluster Priority Reference
${recommendations.rankedPriorities
    .slice(0, 8)
    .map(c => `- **${c.clusterId} ${c.clusterName}${c.critical ? ' ★' : ''}** — ${c.score}/5 (${CATEGORY_LABELS[c.category]})`)
    .join('\n')}

## 4. Risk Management
- **Policy Resistance:** Several protocols have documented resistance patterns (see each protocol's "Policy Resistance" subsection in Chapters 37–40 where available). Pre-brief affected stakeholders before launch.
- **Change Fatigue:** Limit concurrent protocols to 2–3 maximum (Capacity Rule above).
- **Sustainability:** Structural gains decay roughly 5% per period without active maintenance (Memory Decay Formula, Chapter 31). Schedule re-measurement per each protocol's stated schedule, not on an ad hoc basis.

---
*Generated by PIG³ Content Generation Engine — ${dateStamp()}*
`;
}

function generateExecutiveSummaryDoc(req: ContentRequest): string {
  const { result, recommendations, organizationName } = req;
  const { pci, iri, gci, sli } = result.indices;
  const weakest = recommendations.rankedPriorities.slice(0, 3);
  const strongest = [...recommendations.rankedPriorities].reverse().slice(0, 3);
  const topProtocolNames = recommendations.topProtocols.slice(0, 3).map(p => `${p.id} ${p.name}`).join('; ') || 'None currently indicated';

  return `# EXECUTIVE SUMMARY — ${organizationName}
## PIG³ Organizational Health Assessment

${V1_DISCLOSURE}

**Date:** ${dateStamp()}
**Profile:** ${result.profile.code} (${result.profile.name})
**State:** ${result.state.code} — ${result.state.urgency} urgency

### Key Findings
1. **Policy (PCI):** ${pci}/100 — ${bandForIndex(pci)}
2. **Institutions (IRI):** ${iri}/100 — ${bandForIndex(iri)}
3. **Governance (GCI):** ${gci}/100 — ${bandForIndex(gci)}
4. **Structural Lag (SLI, lower is better):** ${sli}/100 — ${bandForIndex(sli, true)}

### Lowest-Scoring Clusters
${formatClusterList(weakest)}

### Highest-Scoring Clusters
${formatClusterList(strongest)}

### Recommended Priority Protocols
${topProtocolNames}

### Bottom Line
${result.state.urgency === 'Low'
    ? `${organizationName} demonstrates a structurally healthy profile (${result.profile.code}). Continue monitoring and reinforcing current practices via the Ongoing Cadence (Chapter 62).`
    : result.state.urgency === 'Moderate'
    ? `${organizationName} shows mixed structural health with specific areas requiring targeted intervention.`
    : `${organizationName} faces significant structural challenges (${result.state.urgency} urgency). Sequenced intervention is recommended — see the Implementation Manual for a prioritized protocol sequence.`}

---
*Generated by PIG³ Content Generation Engine*
`;
}

// ─── Main Generator ─────────────────────────────────────────────────
export function generateContent(req: ContentRequest): string {
  switch (req.type) {
    case 'policy':
      return generatePolicyDocument(req);
    case 'strategy':
      return generateStrategyDocument(req);
    case 'sop':
      return generateSOPDocument(req);
    case 'hr_guidelines':
      return generateHRGuidelines(req);
    case 'ai_governance':
      return generateAIGovernanceDocument(req);
    case 'implementation_manual':
      return generateImplementationManual(req);
    case 'executive_summary':
      return generateExecutiveSummaryDoc(req);
    default:
      return '# Error: Unknown document type';
  }
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  policy: 'Policy Manual',
  strategy: 'Strategic Plan',
  sop: 'Standard Operating Procedures',
  hr_guidelines: 'HR Guidelines',
  ai_governance: 'AI Governance Framework',
  implementation_manual: 'Implementation Manual',
  executive_summary: 'Executive Summary',
};
