# PROJECT_BRIEF.md — Read This First

This file exists so you (Claude Code) don't have to rediscover what was
already decided. It was written by another Claude instance after a multi-
session project that (1) built the real PIG³ Master Bible — a 67-chapter
reference document — and (2) corrected a first-draft web app that had
implemented an *invented* framework instead of the real one, then (3) added
a RAG pipeline to ground an AI Coach in the real Master Bible content.

Read this fully before changing scoring logic, the database schema, or the
AI Coach. Most files also have their own header comments explaining *why*
something is built the way it is — read those too before "fixing" something
that looks odd; it's very possibly intentional and explained right there.

---

## 1. The single most important fact about this codebase

**Every file under `lib/pig3/` implements the REAL PIG³ framework, not a
generic 7-dimension wellness-survey model.** If you ever see or are asked to
add terminology like "PM-1", "PM-7", "Capability", "Implementation
dimension", or a 7-dimension model — **stop**. That was an earlier, wrong
draft that has been fully removed. It does not exist in the real framework
and must never be reintroduced. The real architecture is:

- **3 Pillars:** Policy (P), Institutions (I), Governance (G)
- **+ Cross-Cutting Variables (CV):** 6 clusters, 4A–4F
- **= 29 total diagnostic clusters** (7 Policy, 10 Institutions, 8
  Governance, 6 Cross-Cutting) — see `lib/pig3/clusters.ts`
- **4 diagnostic indices:** PCI, IRI, GCI, SLI — see `lib/pig3/scoring.ts`
- **8 organizational profiles:** SSS through WWW — see `lib/pig3/scoring.ts`
- **16 named intervention protocols:** G-1–G-4, I-1–I-4, P-1–P-3, L-1–L-4 —
  see `lib/pig3/protocols.ts`

If anything you're asked to build doesn't fit this vocabulary, ask before
inventing new terms.

---

## 2. The v1 approximation — the second most important fact

This MVP does **not** implement the full PIG³ diagnostic. The real
framework's PCI/IRI/GCI are computed from named raw operational
sub-variables (e.g., Bus Factor, Decision Latency, Escalation Frequency)
that require data collection beyond a simple survey. **This v1 build
approximates all four indices from 29 cluster-level 1–5 self-report
answers** (one question per cluster) instead.

This is intentional, documented, and **must stay visible to users** — see
`components/dashboard/ScoringDisclaimer.tsx` and the header comments in
`lib/pig3/scoring.ts`. Do not quietly "upgrade" the math to look more
precise than it is without also building real sub-variable data collection
(that's a deliberate v2 task, not something to fake in v1).

Likewise, **protocol recommendations are ranked by cluster weakness, not by
evaluated numeric triggers** — the real Chapter 36 Protocol Trigger Matrix
needs raw sub-variables this version doesn't collect. See
`lib/pig3/recommendations.ts` header comment.

---

## 3. What's fully built and should work once configured

- **Auth:** Clerk sign-up/sign-in pages, webhook to sync users to Supabase
- **Assessment flow:** `assessments/new` — 29-question cluster assessment,
  scoring, writes to `assessments` / `assessment_answers` /
  `assessment_results` / `recommendations` tables
- **Dashboard:** profile/state card, PCI/IRI/GCI/SLI display, radar + bar
  charts across all 29 clusters, ranked recommendations with linked
  protocols
- **AI Coach (RAG):** `/chat` page → `app/api/chat/coach/route.ts` →
  `lib/ai/openai.ts` → `lib/pig3/retrieval.ts`. Retrieves from a
  `knowledge_base` table (pgvector) with a hardcoded keyword-search fallback
  if that table is empty. **Version-aware**: explicitly distinguishes
  canonical Master Bible formulas from the v1 approximation actually used to
  compute a user's numbers — see `lib/ai/openai.ts` header comment.
- **Reports:** list page + `/api/reports/[assessmentId]` route generating a
  text executive summary (no PDF yet — see Section 5)
- **Settings:** org info display, member list, invite form (UI only — see
  Section 5 for what's NOT wired up)
- **Chunking/embedding pipeline:** `scripts/chunk-knowledge-base.ts` +
  `scripts/embed-and-upload.ts` — turns exported Master Bible text into
  embedded `knowledge_base` rows. **You must run this manually once** (see
  Section 6) — it does not run automatically.
- **Document Generator:** `/generate` page → `app/api/content/generate/route.ts`
  → `lib/pig3/content-generator.ts`. Deterministic, template-based (no AI
  calls) generation of 7 document types — Policy Manual, Strategic Plan,
  SOPs, HR Guidelines, AI Governance Framework, Implementation Manual,
  Executive Summary — from a completed assessment's real cluster scores,
  indices, profile, state, and recommended protocols. Every generated
  document carries the same v1-approximation disclosure used elsewhere
  (`ScoringDisclaimer.tsx`'s text, inlined as a markdown blockquote) — these
  are real organization-facing documents, so the disclosure matters more
  here, not less. Downloads as `.md`; no PDF/Word export yet.

---

## 4. A security fix you should know about (don't reintroduce it)

The AI Coach used to be called directly from the `'use client'` chat page,
which would have either silently failed or — if "fixed" naively — exposed
`OPENAI_API_KEY` and/or `SUPABASE_SERVICE_ROLE_KEY` to the browser. This was
fixed by moving all AI Coach logic behind `app/api/chat/coach/route.ts` (a
server route) and having the client call it via `fetch()`.

**Rule going forward:** `lib/ai/openai.ts` and `lib/pig3/retrieval.ts` must
only ever be imported from server-side code (API routes, server
components/actions) — never from a file marked `'use client'`. If you add
new AI features, put the logic in a new API route, not directly in a client
component.

**Precedent for routes needing user identity:** `app/api/content/generate/route.ts`
is the first route to use Clerk's server-side `auth()` helper (from
`@clerk/nextjs/server`) to check `userId` before doing anything — follow
this pattern for any new route that should only work for a signed-in user,
rather than relying solely on Supabase RLS.

---

## 5. Known gaps — listed in the original draft's file tree as "complete,"
## but never actually built. These are not things you broke; they're work
## that still needs doing.

**Update:** Gap #1 below (`/assessments` and `/results/[id]`) has been built
and is no longer a 404 — see the note under it. Gaps #2–5 remain open.

In priority order (suggested):

1. ~~**`app/(dashboard)/assessments/page.tsx`** (list view) and
   **`app/(dashboard)/results/[id]/page.tsx`** — **the sidebar nav already
   links to `/assessments` and `/results` and both will 404 right now.**~~
   **BUILT.** `assessments/page.tsx` lists all assessments (completed and
   in-progress) for the org, scoped by `organization_id`.
   `results/[id]/page.tsx` shows full diagnostic detail for one specific
   completed assessment, also scoped by `organization_id` so one org cannot
   view another's results by guessing or sharing a URL. **Known remaining
   limitation:** in-progress assessments are listed but cannot be resumed —
   the underlying assessment flow (`assessments/new/page.tsx`) has no
   resume capability yet, so the list page intentionally does not link
   incomplete assessments anywhere rather than pointing to a broken resume
   flow. Building real resume support is a larger change to the assessment
   flow itself, not just the list page, and is still open.
2. **`components/reports/ReportPDF.tsx`** — `/api/reports/[assessmentId]`
   currently returns JSON, not an actual downloadable PDF. `@react-pdf/renderer`
   is already in `package.json`'s dependencies; it's just never been used.
3. **Org document upload + chunk + embed flow** — the `knowledge_base`
   table and `match_knowledge_base` function already support
   `organization_id`-scoped chunks (`source_type = 'org_document'`) for
   exactly this, but no UI or API route exists yet to let a user upload
   their own org's documents. Schema is ready; nothing else is.
4. **`app/api/organizations/*`, `app/api/assessments/*`,
   `app/api/knowledge/search/`** — these were listed in the very first
   project tree from the original draft and never written. The Settings
   page currently talks to Supabase directly from the client for org/member
   data; whether you need dedicated API routes for these depends on whether
   you want that logic server-side (recommended if you add anything
   sensitive, like changing billing or roles).
5. **Invite flow** — the Settings page has an invite form UI, but it
   doesn't call anything yet (no handler wired to the "Invite" button). The
   `invitations` table already exists in the schema.

---

## 6. To actually run this locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local: Clerk keys, Supabase URL + anon key + service role key, OpenAI key
```

Then, in Supabase: run `lib/supabase/migrations.sql` against your project
(SQL editor or `supabase db push`). This requires the `pgvector` extension —
enable it in Supabase's dashboard under Database → Extensions before running
the migration, or the `VECTOR(1536)` column type will fail.

```bash
npm run dev
```

The app will run, but the **AI Coach will only have the small hardcoded
seed set in `lib/pig3/knowledge.ts` until you run the chunking pipeline**:

```bash
# 1. Export each of the 67 Master Bible chapters to plain text/markdown,
#    one file per chapter, into ./master-bible-source/. Each file should
#    start with "# CHAPTER NN: TITLE" — see parseChapterHeader() in
#    scripts/chunk-knowledge-base.ts for exactly what it expects.
npm run kb:chunk -- --input ./master-bible-source --out ./chunks.json

# 2. Requires OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY — the script
#    loads .env.local automatically (via dotenv), so as long as those are
#    set there, this works without extra setup.
npm run kb:embed -- --input ./chunks.json
```

Until you do this, `lib/pig3/retrieval.ts` will silently fall back to the
keyword-matched seed set — the app won't error, but AI Coach answers will
have much thinner framework grounding than intended.

---

## 7. Things that will probably need a fix on first build

Nobody has run `npm run build` or `tsc --noEmit` against this code yet — it
was written and manually traced (import-by-import, signature-by-signature)
without an actual TypeScript compiler available in that environment. Expect
a handful of small type errors. Before "fixing" one, check whether the
surrounding header comment explains an intentional design choice (e.g., the
v1 approximation labeling, the `formula_status` version-awareness logic) —
fix the type error without removing the documented behavior.

---

## 8. Vocabulary quick-reference (so you don't have to ask)

| Term | Meaning |
|---|---|
| PCI / IRI / GCI | Policy Consistency / Institutional Repeatability / Governance Clarity Index — 0–100, higher is better |
| SLI | Structural Lag Index — 0–100, **lower** is better (it measures structural debt) |
| Cluster | One of 29 diagnostic units, e.g. `2E` (Culture and Values in Practice) |
| ★ CRITICAL cluster | One of 4 clusters (1C, 2E, 3B, 4A) the framework treats as outsized-impact |
| Profile | 3-letter S/W code per pillar, e.g. `WSW` — see `lib/pig3/scoring.ts` `PROFILE_NAMES` |
| State | SSS / WSW / WWW / CRITICAL — urgency classification, distinct from profile |
| Protocol | One of 16 named interventions, e.g. `G-1` (Ownership Assignment) — see `lib/pig3/protocols.ts` |
| Dependency Hierarchy | The real recommended protocol sequencing order, Chapter 36 |

---

If anything in this brief conflicts with what you observe in the actual
code, trust the code and its inline comments — this brief is a map, not the
territory, and the code is the most recently verified source of truth.
