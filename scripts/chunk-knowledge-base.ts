// scripts/chunk-knowledge-base.ts
//
// CHUNKING STRATEGY: fixed-size chunking with overlap (per product decision),
// with one mitigation layered on top: before splitting at a fixed boundary,
// the chunker checks whether that boundary falls inside a "protected block"
// — a formula definition (Chapter 66 style: "PCI = ...", "F1 ... F20", a
// protocol's Completion Criteria / Escalation Rules table) — and if so,
// shifts the split point to the nearest protected-block edge instead. This
// is NOT full structural parsing; it's a cheap heuristic that catches the
// highest-cost failure mode (a formula separated from its variable table)
// without the setup cost of true section-aware chunking.
//
// USAGE:
//   ts-node scripts/chunk-knowledge-base.ts --input ./master-bible-source/ --out ./chunks.json
//
// Input: a directory of plain-text or markdown files, one per chapter,
// named like "Chapter45_Government.txt" (chapter number + title extracted
// from filename) or with a "# CHAPTER NN: TITLE" first line (preferred —
// matches the actual delivered .docx-derived text exports).
//
// Output: chunks.json — an array of chunk objects ready for embedding
// (see embed-and-upload.ts), each tagged with chapter/section/formula_status
// metadata derived from lightweight pattern matching, not a real parser.

import * as fs from 'fs';
import * as path from 'path';

const CHUNK_SIZE = 800; // approx tokens; using ~4 chars/token heuristic below
const OVERLAP = 180; // approx tokens of overlap between consecutive chunks
const CHARS_PER_TOKEN = 4;
const CHUNK_CHARS = CHUNK_SIZE * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP * CHARS_PER_TOKEN;

interface RawChunk {
  source_type: 'master_bible';
  chapter: string;
  section: string;
  title: string;
  content: string;
  formula_status: 'canonical' | 'v1_approximation_note' | 'narrative';
  related_concepts: string[];
  keywords: string[];
  chunk_index: number;
}

// Patterns indicating a "protected block" we should avoid splitting through.
// These are deliberately broad — false positives just mean we shift a split
// point slightly, which costs nothing; false negatives mean we fall back to
// plain fixed-size splitting, which is the accepted baseline risk per the
// product decision to use fixed-size + overlap.
const FORMULA_START_PATTERNS = [
  /^(PCI|IRI|GCI|SLI|BPI|BAS|BFS|SGI|BRI|FCI|BHI|TSI)\s*=/m,
  /^F\d{1,2}\s+[A-Za-z]/m, // F1 Policy Consistency Index, F12 Friction Score, etc.
  /^Where:/m,
  /^Completion Criteria:/m,
  /^Escalation Rules:/m,
  /^Re-Measurement Schedule:/m,
  /^Policy Resistance:/m,
];

const CANONICAL_FORMULA_MARKERS = [
  'PCI =', 'IRI =', 'GCI =', 'SLI =', 'BPI =', 'BAS =', 'BFS =', 'SGI =',
  'BRI =', 'FCI =', 'BHI =', 'TSI =', 'F1 ', 'F2 ', 'F3 ', 'F4 ', 'F5 ',
  'Pillar Value (1', 'Dₜ = f(', 'D_quality = f(',
];

const V1_APPROXIMATION_MARKERS = [
  'v1 approximation', 'v1 APPROXIMATION', 'cluster-level approximation',
  'named placeholder', 'v1 lightweight assessment',
];

function classifyFormulaStatus(text: string): 'canonical' | 'v1_approximation_note' | 'narrative' {
  if (V1_APPROXIMATION_MARKERS.some(m => text.includes(m))) return 'v1_approximation_note';
  if (CANONICAL_FORMULA_MARKERS.some(m => text.includes(m))) return 'canonical';
  return 'narrative';
}

function extractRelatedConcepts(text: string): string[] {
  const concepts = new Set<string>();
  const patterns: RegExp[] = [
    /\b(PCI|IRI|GCI|SLI|BPI|BAS|BFS|SGI|BRI|FCI|BHI|TSI)\b/g,
    /\b([1-4][A-J])\b/g, // cluster IDs
    /\b([GIPL]-\d)\b/g, // protocol IDs
    /\bF(\d{1,2})\b/g, // canonical formula IDs
  ];
  patterns.forEach(re => {
    let match;
    while ((match = re.exec(text)) !== null) {
      concepts.add(match[1] ?? match[0]);
    }
  });
  return Array.from(concepts);
}

function extractKeywords(text: string): string[] {
  // Lightweight heuristic: capitalized multi-word phrases and known framework
  // nouns. This is a stopgap for the v1 hardcoded knowledge.ts keyword style;
  // real retrieval should rely on the embedding, not these keywords — they
  // exist mainly for the non-vector fallback path (see lib/pig3/knowledge.ts).
  const stopwords = new Set(['The', 'This', 'That', 'These', 'Those', 'Chapter', 'Section']);
  const words = text.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || [];
  const filtered = words.filter(w => !stopwords.has(w));
  return Array.from(new Set(filtered)).slice(0, 12).map(w => w.toLowerCase());
}

function findNearestProtectedEdge(text: string, targetIndex: number, searchWindow: number): number {
  // Look backward and forward from targetIndex for a protected-block start
  // pattern within searchWindow chars; if found, return that boundary
  // instead of the raw targetIndex. If multiple matches, prefer the one
  // closest to targetIndex.
  const windowStart = Math.max(0, targetIndex - searchWindow);
  const windowEnd = Math.min(text.length, targetIndex + searchWindow);
  const windowText = text.slice(windowStart, windowEnd);

  let bestOffset: number | null = null;
  let bestDistance = Infinity;

  for (const pattern of FORMULA_START_PATTERNS) {
    const re = new RegExp(pattern.source, 'gm');
    let match;
    while ((match = re.exec(windowText)) !== null) {
      const absoluteIndex = windowStart + match.index;
      const distance = Math.abs(absoluteIndex - targetIndex);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestOffset = absoluteIndex;
      }
    }
  }

  return bestOffset !== null ? bestOffset : targetIndex;
}

function splitIntoChunks(fullText: string): { content: string; index: number }[] {
  const chunks: { content: string; index: number }[] = [];
  let cursor = 0;
  let chunkIndex = 0;

  while (cursor < fullText.length) {
    let end = Math.min(cursor + CHUNK_CHARS, fullText.length);

    if (end < fullText.length) {
      // Try to shift `end` to a protected-block edge if one is nearby,
      // searching up to half the overlap distance in either direction.
      end = findNearestProtectedEdge(fullText, end, Math.floor(OVERLAP_CHARS / 2));
    }

    const content = fullText.slice(cursor, end).trim();
    if (content.length > 0) {
      chunks.push({ content, index: chunkIndex });
      chunkIndex++;
    }

    if (end >= fullText.length) break;
    cursor = Math.max(end - OVERLAP_CHARS, cursor + 1); // ensure forward progress
  }

  return chunks;
}

function parseChapterHeader(fileContent: string, fileName: string): { chapter: string; title: string } {
  const headerMatch = fileContent.match(/^#?\s*CHAPTER\s+(\d+):\s*(.+)$/im);
  if (headerMatch) {
    return { chapter: `Chapter ${headerMatch[1]}`, title: headerMatch[2].trim() };
  }
  // Fallback: parse from filename like "Chapter45_Government.txt"
  const fileMatch = fileName.match(/Chapter(\d+)_(.+)\.(txt|md)$/i);
  if (fileMatch) {
    return { chapter: `Chapter ${fileMatch[1]}`, title: fileMatch[2].replace(/_/g, ' ') };
  }
  return { chapter: 'Unknown', title: fileName };
}

function detectSection(content: string): string {
  // Looks for the nearest preceding "## NN.N Section Title" style heading
  // within the chunk itself. If the chunk starts mid-section (likely, given
  // fixed-size chunking), this returns the first section heading found in
  // the chunk, which may not be the section the chunk's beginning belongs
  // to — acceptable imprecision for v1 citation purposes.
  const match = content.match(/##?\s*(\d+\.\d+\s+[^\n]+)/);
  return match ? match[1].trim() : '';
}

function chunkFile(filePath: string): RawChunk[] {
  const fileName = path.basename(filePath);
  const fullText = fs.readFileSync(filePath, 'utf-8');
  const { chapter, title: chapterTitle } = parseChapterHeader(fullText, fileName);

  const rawChunks = splitIntoChunks(fullText);

  return rawChunks.map(({ content, index }) => ({
    source_type: 'master_bible' as const,
    chapter,
    section: detectSection(content),
    title: chapterTitle,
    content,
    formula_status: classifyFormulaStatus(content),
    related_concepts: extractRelatedConcepts(content),
    keywords: extractKeywords(content),
    chunk_index: index,
  }));
}

function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outIdx = args.indexOf('--out');
  const inputDir = inputIdx >= 0 ? args[inputIdx + 1] : './master-bible-source';
  const outPath = outIdx >= 0 ? args[outIdx + 1] : './chunks.json';

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    console.error('Export each chapter to plain text/markdown first (see docx skill text extraction).');
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputDir)
    .filter(f => f.endsWith('.txt') || f.endsWith('.md'))
    .map(f => path.join(inputDir, f));

  if (files.length === 0) {
    console.error(`No .txt or .md files found in ${inputDir}`);
    process.exit(1);
  }

  let allChunks: RawChunk[] = [];
  for (const file of files) {
    const chunks = chunkFile(file);
    allChunks = allChunks.concat(chunks);
    console.log(`${path.basename(file)}: ${chunks.length} chunks`);
  }

  const canonicalCount = allChunks.filter(c => c.formula_status === 'canonical').length;
  const approxCount = allChunks.filter(c => c.formula_status === 'v1_approximation_note').length;
  const narrativeCount = allChunks.filter(c => c.formula_status === 'narrative').length;

  console.log(`\nTotal: ${allChunks.length} chunks`);
  console.log(`  canonical: ${canonicalCount}`);
  console.log(`  v1_approximation_note: ${approxCount}`);
  console.log(`  narrative: ${narrativeCount}`);

  fs.writeFileSync(outPath, JSON.stringify(allChunks, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main();
