// lib/pig3/retrieval.ts
//
// Real vector retrieval against the knowledge_base table, replacing the
// keyword-matching searchKnowledge() in knowledge.ts for production use.
// knowledge.ts's hardcoded KNOWLEDGE_BASE array and searchKnowledge() remain
// in place as a fallback (see retrieveKnowledge() below) for local dev or
// if the knowledge_base table is empty/unreachable — this keeps the AI
// Coach functional even before the chunking/embedding pipeline has been run.

import OpenAI from 'openai';
import { supabaseAdmin } from '../supabase/server';
import { KnowledgeItem, searchKnowledge as keywordSearchKnowledge } from './knowledge';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? 'missing' });
  return _openai;
}
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MIN_SIMILARITY = 0.7;

export interface RetrievedChunk {
  id: string;
  sourceType: 'master_bible' | 'org_document';
  chapter: string;
  section: string;
  title: string;
  content: string;
  formulaStatus: 'canonical' | 'v1_approximation_note' | 'narrative';
  relatedConcepts: string[];
  similarity: number;
}

async function embedQuery(query: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });
  return response.data[0].embedding;
}

/**
 * Real vector similarity search via the match_knowledge_base Postgres
 * function (lib/supabase/migrations.sql). Returns [] if the table is empty,
 * unreachable, or no chunk clears the similarity threshold — callers should
 * treat an empty result as "the framework doesn't clearly address this,"
 * not retry with a lower threshold by default (see retrieveKnowledge()).
 */
export async function vectorSearch(
  query: string,
  options: { organizationId?: string; matchCount?: number; minSimilarity?: number } = {}
): Promise<RetrievedChunk[]> {
  const { organizationId = null, matchCount = DEFAULT_MATCH_COUNT, minSimilarity = DEFAULT_MIN_SIMILARITY } = options;

  try {
    const embedding = await embedQuery(query);

    const { data, error } = await supabaseAdmin.rpc('match_knowledge_base', {
      query_embedding: embedding,
      match_count: matchCount,
      org_id_filter: organizationId,
      min_similarity: minSimilarity,
    });

    if (error) {
      console.error('vectorSearch error:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      sourceType: row.source_type,
      chapter: row.chapter,
      section: row.section,
      title: row.title,
      content: row.content,
      formulaStatus: row.formula_status,
      relatedConcepts: row.related_concepts || [],
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('vectorSearch exception:', err);
    return [];
  }
}

/**
 * Main retrieval entry point used by lib/ai/openai.ts. Tries real vector
 * search first; if it returns nothing (empty table, RPC failure, or no
 * chunk above the similarity threshold), falls back to the hardcoded
 * keyword-matched KNOWLEDGE_BASE seed set so the AI Coach degrades
 * gracefully rather than losing all framework grounding.
 */
export async function retrieveKnowledge(
  query: string,
  options: { organizationId?: string } = {}
): Promise<{ chunks: RetrievedChunk[]; usedFallback: boolean }> {
  const vectorResults = await vectorSearch(query, options);

  if (vectorResults.length > 0) {
    return { chunks: vectorResults, usedFallback: false };
  }

  // Fallback: convert the keyword-matched seed items into the same shape,
  // marked as fallback so the caller can be transparent about reduced
  // grounding quality if it chooses to (currently used silently to keep
  // the assistant functional; see lib/ai/openai.ts).
  const seedMatches: KnowledgeItem[] = keywordSearchKnowledge(query);
  const asChunks: RetrievedChunk[] = seedMatches.map(item => ({
    id: item.id,
    sourceType: 'master_bible',
    chapter: item.chapter,
    section: item.section,
    title: item.title,
    content: item.content,
    formulaStatus: item.chapter.includes('66') ? 'canonical' : 'narrative',
    relatedConcepts: item.keywords,
    similarity: 0, // not a real similarity score; seed fallback has no embedding comparison
  }));

  return { chunks: asChunks, usedFallback: true };
}
