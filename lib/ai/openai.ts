// lib/ai/openai.ts
//
// AI Coach — grounded in the REAL PIG³ framework via retrieval-augmented
// generation against the knowledge_base table (see lib/pig3/retrieval.ts).
//
// VERSION-AWARENESS (product decision: retrieval must distinguish canonical
// Master Bible formulas from the pig3-app v1 approximations, and the
// assistant must say which one backs the user's actual numbers):
//
// Every retrieved chunk carries a formula_status. When the user has
// assessment data, that data was computed via v1 cluster-level
// approximations (see lib/pig3/scoring.ts header) for ALL FOUR indices
// (PCI/IRI/GCI/SLI) — there is no exception. If a 'canonical' chunk is
// retrieved (e.g., Chapter 66's real SLI = 0.30×L2_lag + ... formula), the
// prompt explicitly flags it as canonical-but-not-what-produced-the-user's-
// number, so the model cannot present the canonical formula as the
// explanation for a number it didn't actually generate.

import OpenAI from 'openai';
import { AssessmentResult } from '../pig3/types';
import { retrieveKnowledge, RetrievedChunk } from '../pig3/retrieval';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const V1_APPROXIMATION_DISCLOSURE =
  'This user\'s PCI, IRI, GCI, and SLI were ALL computed via the pig3-app v1 lightweight ' +
  'method: one self-report score per cluster, averaged per pillar, NOT the canonical ' +
  'Chapter 66 raw-sub-variable formulas. There is no exception — every index in this ' +
  "user's results is a v1 approximation.";

function formatChunkForPrompt(chunk: RetrievedChunk, hasAssessmentData: boolean): string {
  let label = `[${chunk.chapter}${chunk.section ? ' | ' + chunk.section : ''}]`;

  if (chunk.formulaStatus === 'canonical') {
    label += ' (CANONICAL FORMULA)';
  } else if (chunk.formulaStatus === 'v1_approximation_note') {
    label += ' (v1 APPROXIMATION NOTE)';
  }

  let entry = `${label}: ${chunk.content}`;

  // If this is a canonical formula chunk AND the user has live assessment
  // data, explicitly warn the model not to conflate the two — this is the
  // core version-awareness behavior the product decision requires.
  if (chunk.formulaStatus === 'canonical' && hasAssessmentData) {
    entry += `\n  ⚠ NOTE: this is the CANONICAL formula. It is NOT how this user's current ` +
      `number was calculated — their result used the v1 approximation (see disclosure above).`;
  }

  return entry;
}

export async function generateAICoachResponse(
  question: string,
  result: AssessmentResult | null,
  organizationName: string,
  organizationId?: string
): Promise<string> {
  const { chunks, usedFallback } = await retrieveKnowledge(question, { organizationId });
  const hasAssessmentData = result !== null;

  let context = `You are the PIG³ AI Coach — an expert on the PIG³ organizational structural health framework.\n\n`;
  context += `Never invent a "7-dimension" model or terms like PM-1/Capability/Implementation — those do not `;
  context += `exist in PIG³. The real architecture is three pillars (Policy, Institutions, Governance) plus `;
  context += `Cross-Cutting Variables, measured via PCI, IRI, GCI, and SLI.\n\n`;
  context += `Organization: ${organizationName}\n`;

  if (result) {
    context += `\nASSESSMENT RESULTS (v1 lightweight method — see disclosure below):\n`;
    context += `- PCI (Policy Consistency Index): ${result.indices.pci}/100\n`;
    context += `- IRI (Institutional Repeatability Index): ${result.indices.iri}/100\n`;
    context += `- GCI (Governance Clarity Index): ${result.indices.gci}/100\n`;
    context += `- SLI (Structural Lag Index, lower is better): ${result.indices.sli}/100\n`;
    context += `- Profile: ${result.profile.code} (${result.profile.name}) — ${result.profile.description}\n`;
    context += `- State: ${result.state.code}, urgency ${result.state.urgency} — ${result.state.description}\n`;
    context += `- Pillar values (1-5): P=${result.pillarValues.pValue}, I=${result.pillarValues.iValue}, G=${result.pillarValues.gValue}\n`;
    context += `\nVERSION DISCLOSURE: ${V1_APPROXIMATION_DISCLOSURE}\n`;
  } else {
    context += `\nThis user has not completed an assessment yet — there is no live data to reference. `;
    context += `Answer framework questions generally; do not imply they have results.\n`;
  }

  if (chunks.length > 0) {
    context += `\nRELEVANT PIG³ FRAMEWORK CONTENT${usedFallback ? ' (seed fallback set — limited coverage)' : ''}:\n`;
    chunks.forEach(chunk => {
      context += `- ${formatChunkForPrompt(chunk, hasAssessmentData)}\n`;
    });
  } else {
    context += `\nNo framework content matched this question closely enough to retrieve confidently. `;
    context += `If the question is about PIG³ specifically, say the framework doesn't clearly address this `;
    context += `rather than guessing. You may still use general organizational reasoning, clearly labeled as such.\n`;
  }

  context += `\nUser Question: ${question}\n\n`;
  context += `RESPONSE PRIORITY (in order): (1) PIG³ Framework content above, (2) general organizational `;
  context += `reasoning if the framework is silent — clearly flagged as such, not presented as framework guidance. `;
  context += `When a CANONICAL FORMULA chunk is marked as not matching the user's actual v1 number, say so plainly `;
  context += `if the question concerns how their number was calculated. `;
  context += `Reference specific clusters (e.g., "2E Culture and Values in Practice"), the real indices `;
  context += `(PCI/IRI/GCI/SLI), or the real 16 protocols (G-1...L-4) when relevant. `;
  context += `Keep responses under 800 tokens.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are the PIG³ AI Coach. You only use the real PIG³ framework: Policy/Institutions/Governance pillars, ' +
            'Cross-Cutting Variables, PCI/IRI/GCI/SLI indices, the 8 profiles (SSS-WWW), and the 16 named protocols ' +
            '(G-1 to G-4, I-1 to I-4, P-1 to P-3, L-1 to L-4). You never invent dimensions, indices, or protocols ' +
            'that are not part of this framework. You always distinguish canonical Master Bible formulas from ' +
            "the v1 approximation method actually used to compute a user's results, when both are relevant.",
        },
        { role: 'user', content: context },
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    return response.choices[0].message.content || 'I apologize, but I could not generate a response. Please try again.';
  } catch (error) {
    console.error('AI Coach Error:', error);
    return 'I apologize, but I encountered an error. Please try again later.';
  }
}
