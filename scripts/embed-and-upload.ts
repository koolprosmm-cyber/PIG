// scripts/embed-and-upload.ts
//
// Reads chunks.json (produced by chunk-knowledge-base.ts), generates an
// OpenAI embedding for each chunk's content, and upserts into the
// knowledge_base table via the Supabase service-role client.
//
// USAGE:
//   ts-node scripts/embed-and-upload.ts --input ./chunks.json
//
// Run this once after chunking, and again whenever the Master Bible source
// changes. This is a batch/admin script — it is NOT called from the running
// app. Requires OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in the
// environment (same vars the app itself uses).

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

// This is a standalone script run via ts-node, outside of Next.js's request
// lifecycle — Next.js normally loads .env.local automatically for the app
// itself, but a standalone script does not get that for free. Load it
// explicitly so `npm run kb:embed` works without extra setup.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions, matches schema
const BATCH_SIZE = 20; // chunks per OpenAI embeddings request and per Supabase insert

interface Chunk {
  source_type: 'master_bible' | 'org_document';
  organization_id?: string;
  chapter: string;
  section: string;
  title: string;
  content: string;
  formula_status: 'canonical' | 'v1_approximation_note' | 'narrative';
  related_concepts: string[];
  keywords: string[];
  chunk_index: number;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.map(d => d.embedding);
}

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : './chunks.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}. Run chunk-knowledge-base.ts first.`);
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set.');
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set.');
    process.exit(1);
  }

  const chunks: Chunk[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  console.log(`Loaded ${chunks.length} chunks from ${inputPath}`);

  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const embeddings = await embedBatch(batch.map(c => c.content));

      const rows = batch.map((chunk, idx) => ({
        source_type: chunk.source_type,
        organization_id: chunk.organization_id ?? null,
        chapter: chunk.chapter,
        section: chunk.section,
        title: chunk.title,
        content: chunk.content,
        formula_status: chunk.formula_status,
        related_concepts: chunk.related_concepts,
        keywords: chunk.keywords,
        chunk_index: chunk.chunk_index,
        embedding: embeddings[idx],
      }));

      const { error } = await supabaseAdmin.from('knowledge_base').insert(rows);
      if (error) {
        console.error(`Batch ${i}-${i + batch.length} failed:`, error.message);
        failed += batch.length;
      } else {
        uploaded += batch.length;
        console.log(`Uploaded ${uploaded}/${chunks.length}`);
      }
    } catch (err) {
      console.error(`Batch ${i}-${i + batch.length} error:`, err);
      failed += batch.length;
    }

    // Basic rate-limit courtesy delay between batches.
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\nDone. Uploaded: ${uploaded}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main();
