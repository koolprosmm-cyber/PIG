# PIG³ Organizational Health Platform — Phase 1 MVP (Corrected)

## What is PIG³?

PIG³ diagnoses organizational structural health using three interdependent
pillars — **P**olicy, **I**nstitutions, **G**overnance — modified by
Cross-Cutting Variables (CV), expressed as `(P × I × G) ⊕ CV → HE`. The
pillars are multiplicative, not additive: weakness in any one pillar
degrades the whole system.

The full framework organizes 92 diagnostic elements into **29 clusters**
(7 Policy, 10 Institutions, 8 Governance, 6 Cross-Cutting), computes four
diagnostic indices (**PCI, IRI, GCI, SLI**), classifies organizations into
one of **8 profiles** (SSS through WWW), and recommends from a catalog of
**16 named intervention protocols** (G-1–G-4, I-1–I-4, P-1–P-3, L-1–L-4).

> **This codebase was corrected from an earlier draft that implemented an
> invented "7-dimension" model (Policy/Structure/Culture/Capability/
> Strategy/Implementation/Resources, labeled PM-1 through PM-7). That model
> does not exist in the real PIG³ framework and has been fully removed.**

## v1 Scope — What This MVP Actually Measures

This is a **lightweight v1 assessment**, not the full PIG³ diagnostic:

- **29 questions**, one per cluster (not the full 92-element / 90-question
  diagnostic). Each cluster is scored with a single 1–5 self-report answer.
- **PCI, IRI, and GCI are v1 approximations.** The canonical formulas
  (Chapter 66) are weighted combinations of named raw operational
  sub-variables (e.g., Bus Factor, Decision Latency, Escalation Frequency)
  that require data collection beyond a Likert survey. v1 approximates each
  index as the average of its pillar's cluster scores instead. This is
  clearly labeled in-app (see `ScoringDisclaimer.tsx`) and in code comments
  (`lib/pig3/scoring.ts`).
- **SLI is a named placeholder**, not the canonical Structural Lag Index.
  The real SLI is built from 4 specific structural-lag sub-variables with no
  direct analogue among the 29 clusters; v1 approximates it from the
  Cross-Cutting clusters (4A–4F) as the closest available proxy.
- **Profile (SSS–WWW) and State classification (SSS/WSW/WWW/CRITICAL)** use
  the real Chapter 12/14 logic, computed from the v1-approximated indices.
- **Protocol recommendations rank clusters by weakness** and link to the
  real, relevant protocol(s) — they do **not** evaluate the real numeric
  trigger thresholds from the Chapter 36 Protocol Trigger Matrix, since
  those require the raw sub-variables this version doesn't collect.

**v2 should replace the cluster-level approximation with true sub-variable
collection** so PCI/IRI/GCI/SLI can be computed from their canonical
formulas, and so real protocol triggers can be evaluated.

## Features

- **Organization Management** — Create organizations, invite team members, assign roles
- **Assessment Engine** — 29-question lightweight assessment across the 4 real PIG³ categories
- **Results Dashboard** — Profile, state, PCI/IRI/GCI/SLI, and all 29 cluster scores
- **Recommendations** — Ranked weak clusters linked to real PIG³ protocols
- **AI Coach** — Ask questions about your results, grounded in real PIG³ chapters/concepts
- **Reports** — Download executive summaries referencing real indices and protocols

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Clerk
- **AI:** OpenAI GPT-4o
- **Hosting:** Vercel

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/pig3-app.git
cd pig3-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

### 4. Set up Supabase

1. Create a Supabase project
2. Run the migration in `lib/supabase/migrations.sql`
3. Enable Row Level Security

### 5. Set up Clerk

1. Create a Clerk application
2. Add the webhook URL: `https://your-domain.com/api/auth/webhook`
3. Copy the keys to `.env.local`

### 6. Set up OpenAI

1. Create an OpenAI account
2. Generate an API key
3. Add to `.env.local`

### 7. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
pig3-app/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Dashboard, assessments, chat, reports, settings pages
│   ├── api/             # API routes (auth webhook, reports)
│   └── components/      # React components
├── lib/
│   ├── pig3/            # PIG³ core logic — clusters, scoring, protocols, recommendations, knowledge
│   ├── supabase/        # Database client + migrations
│   └── ai/              # OpenAI integration
├── public/              # Static assets
└── types/               # TypeScript types
```

## Core PIG³ Logic Reference

| File | Purpose | Canonical Source |
|---|---|---|
| `lib/pig3/types.ts` | All PIG³ type definitions | Chapters 9, 11, 12, 14, 66 |
| `lib/pig3/clusters.ts` | The 29 clusters + v1 condensed questions | Chapters 9, 67 |
| `lib/pig3/scoring.ts` | PCI/IRI/GCI/SLI, pillar values, profile, state | Chapters 11, 12, 14, 66 |
| `lib/pig3/protocols.ts` | The 16 real intervention protocols | Chapters 36–41 |
| `lib/pig3/recommendations.ts` | Ranked-weakness recommendation logic | Chapter 36 (Dependency Hierarchy) |
| `lib/pig3/knowledge.ts` | Seed knowledge base + keyword fallback for the AI Coach | Representative sample of Chapters 1–67 |
| `lib/pig3/retrieval.ts` | Real vector retrieval against `knowledge_base`, with keyword fallback | — |

**Every file above has a header comment explaining exactly which parts are
canonical and which are v1 approximations.** Read those before modifying
the scoring logic.

## RAG Pipeline — Grounding the AI Coach in the Master Bible

The AI Coach (`app/api/chat/coach/route.ts` → `lib/ai/openai.ts`) is
retrieval-augmented: it searches the real 67-chapter Master Bible content
(once loaded) instead of relying on the model's training data or the small
hardcoded seed set in `knowledge.ts`.

### One-time setup

1. **Export the Master Bible to plain text/markdown**, one file per chapter,
   into a local directory (e.g. `./master-bible-source/`). Each file should
   start with a `# CHAPTER NN: TITLE` line (this is how the chunker
   identifies chapter/title — see `parseChapterHeader()` in
   `scripts/chunk-knowledge-base.ts`).

2. **Run the migration** in `lib/supabase/migrations.sql` if you haven't
   already — it defines the `knowledge_base` table (with `formula_status`
   and `related_concepts` metadata columns) and the `match_knowledge_base`
   Postgres function used for similarity search.

3. **Chunk the source:**
   ```bash
   npm run kb:chunk -- --input ./master-bible-source --out ./chunks.json
   ```
   This uses **fixed-size chunking with overlap** (per product decision),
   with one mitigation: split points are nudged to the nearest formula/
   protocol-table boundary when one is nearby, to reduce (not eliminate)
   the risk of separating a formula from its variable table. See the header
   comment in `scripts/chunk-knowledge-base.ts` for exactly how this works
   and its limits — it is a heuristic, not a real document parser.

4. **Generate embeddings and upload:**
   ```bash
   npm run kb:embed -- --input ./chunks.json
   ```
   Requires `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in your
   environment. Uses `text-embedding-3-small` (1536 dimensions, matching the
   `knowledge_base.embedding` column).

### How retrieval works at request time

- `lib/pig3/retrieval.ts`'s `retrieveKnowledge()` embeds the user's question,
  calls `match_knowledge_base` via Supabase RPC, and returns the top matches
  above a similarity threshold (default 0.7). **If nothing clears the
  threshold, it returns an empty result rather than forcing the nearest
  chunks regardless of relevance** — the AI Coach is instructed to say the
  framework doesn't clearly address the question in that case, rather than
  guessing.
- If the `knowledge_base` table is empty or the RPC call fails, retrieval
  **falls back** to the hardcoded keyword-matched seed set in
  `knowledge.ts`, so the AI Coach stays functional (with reduced grounding)
  even before the chunking pipeline has been run.

### Version-awareness (important)

Every chunk is tagged `formula_status`: `canonical`, `v1_approximation_note`,
or `narrative`. When a user has assessment data, **all four of their
indices (PCI/IRI/GCI/SLI) were computed via the v1 cluster-level
approximation**, never the canonical Chapter 66 formulas. If retrieval
surfaces a `canonical` chunk (e.g., the real SLI formula) while the user has
live results, `lib/ai/openai.ts` explicitly flags that chunk as **not**
matching how their number was actually calculated, so the assistant can't
present the canonical formula as the explanation for a v1-approximated
number. See the header comment in `lib/ai/openai.ts` for the exact mechanism.

### Security note

All AI Coach logic (OpenAI calls, Supabase service-role calls) runs
**server-side only**, behind `app/api/chat/coach/route.ts`. The client chat
page calls this route via `fetch()` — it never imports `lib/ai/openai.ts` or
`lib/pig3/retrieval.ts` directly. This matters: those modules use
`OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, both server-only secrets
that must never be reachable from a `'use client'` component or bundled into
browser JS.

### Scoping to a single organization (v2)

The `knowledge_base` table and `match_knowledge_base` function already
support `organization_id`-scoped chunks (`source_type = 'org_document'`),
so an organization's own uploaded documents can be retrieved alongside the
Master Bible without leaking into other organizations' AI Coach sessions.
Building the upload/chunk/embed flow for org documents is not yet
implemented — only the schema and retrieval-side filtering are in place.

## Development

```bash
npm run dev      # development server
npm run build    # production build
npm start        # production server
npm run lint     # linting
```

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel
```

## License

Proprietary — All rights reserved.

## Contact

For questions or support, contact: support@pig3framework.com
