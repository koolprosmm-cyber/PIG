-- lib/supabase/migrations.sql
--
-- CORRECTED for the real PIG³ framework. The original draft's
-- assessment_results table used pm1_score...pm7_score columns tied to the
-- invented 7-dimension model. This version stores per-cluster answers
-- (29 clusters: 1A-4F) and the real diagnostic indices (PCI/IRI/GCI/SLI).

-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  size VARCHAR(50),
  stage VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Users (synced from Clerk via webhook)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Organization Members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- 4. Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff',
  token VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Assessments
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'PIG³ Organizational Health Assessment (v1 — 29-cluster lightweight)',
  status VARCHAR(50) DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- 6. Assessment Answers
-- cluster_id is one of the real 29 cluster codes: 1A-1G, 2A-2J, 3A-3H, 4A-4F
CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  cluster_id VARCHAR(4) NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 1 AND value <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_id, cluster_id)
);

-- 7. Assessment Results
-- Stores the real PIG³ diagnostic indices, pillar values, profile, and state.
-- All index/score values are v1 cluster-level approximations — see
-- lib/pig3/scoring.ts header comment for the methodology note.
CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  pci FLOAT,                  -- Policy Consistency Index, 0-100
  iri FLOAT,                  -- Institutional Repeatability Index, 0-100
  gci FLOAT,                  -- Governance Clarity Index, 0-100
  sli FLOAT,                  -- Structural Lag Index, 0-100 (lower is better)
  p_value FLOAT,               -- Policy pillar value, 1.0-5.0
  i_value FLOAT,               -- Institutions pillar value, 1.0-5.0
  g_value FLOAT,               -- Governance pillar value, 1.0-5.0
  bpi FLOAT,                   -- Business Performance Index, 1.0-5.0
  bas FLOAT,                   -- Balance Score, 1.0-5.0
  bfs FLOAT,                   -- Friction Score, 0-4 (lower is better)
  profile_code VARCHAR(3),     -- one of SSS, SSW, SWS, WSS, SWW, WSW, WWS, WWW
  profile_name VARCHAR(50),
  state_code VARCHAR(10),      -- SSS, WSW, WWW, or CRITICAL
  state_urgency VARCHAR(20),   -- Low, Moderate, High, Severe
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Recommendations
-- rankedPriorities: JSON array of {clusterId, clusterName, category, score, critical, relatedProtocols}
-- topProtocols: JSON array of real protocol objects (G-1...L-4), ordered by Dependency Hierarchy
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_result_id UUID REFERENCES assessment_results(id) ON DELETE CASCADE,
  ranked_priorities JSONB,
  top_protocols JSONB,
  executive_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 9. Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Knowledge Base (for RAG)
-- Holds the real 67-chapter Master Bible content, chunked for retrieval-
-- augmented generation, plus (optionally, v2+) organization-specific
-- uploaded documents in the same table under a different source_type.
--
-- VERSION-AWARENESS NOTE: formula_status distinguishes chunks that state a
-- CANONICAL Master Bible formula/protocol from chunks that are narrative
-- (no formula claim at all). This matters because the pig3-app v1 MVP
-- computes PCI/IRI/GCI/SLI as cluster-level APPROXIMATIONS, not via the
-- canonical raw-sub-variable formulas defined in Chapter 66 (see
-- lib/pig3/scoring.ts header). If a user has v1 assessment data and asks
-- the AI Coach "how was my SLI calculated?", retrieval may surface the
-- canonical Chapter 66 SLI chunk (formula_status = 'canonical') — the
-- response layer (lib/ai/openai.ts) MUST be told this and must say the
-- user's number is a v1 approximation, not present the canonical formula
-- as if it produced their number. See generateAICoachResponse().
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) DEFAULT 'master_bible',  -- 'master_bible' | 'org_document' (v2+)
  organization_id UUID REFERENCES organizations(id), -- NULL for master_bible chunks; required for org_document chunks
  chapter VARCHAR(50),
  part VARCHAR(100),
  section VARCHAR(150),
  title VARCHAR(255),
  content TEXT NOT NULL,
  formula_status VARCHAR(20) DEFAULT 'narrative',  -- 'canonical' | 'v1_approximation_note' | 'narrative'
  related_concepts TEXT[],  -- e.g. ['SLI', 'L1', 'L2', 'L3', 'L4'] or ['G-1', 'G-2']
  keywords TEXT[],
  chunk_index INTEGER,       -- position within the source document, for citing/reassembly
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Knowledge Base Search Index
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_knowledge_base_org ON knowledge_base(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_knowledge_base_source_type ON knowledge_base(source_type);

-- Similarity search function. Master Bible chunks always have
-- organization_id = NULL and are visible to every caller; org_document
-- chunks are only returned when org_id_filter matches, so retrieval can be
-- scoped per-organization without leaking one org's uploaded documents
-- into another org's AI Coach session.
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  org_id_filter UUID DEFAULT NULL,
  min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  source_type VARCHAR,
  chapter VARCHAR,
  section VARCHAR,
  title VARCHAR,
  content TEXT,
  formula_status VARCHAR,
  related_concepts TEXT[],
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.source_type,
    kb.chapter,
    kb.section,
    kb.title,
    kb.content,
    kb.formula_status,
    kb.related_concepts,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND (kb.organization_id IS NULL OR kb.organization_id = org_id_filter)
    AND 1 - (kb.embedding <=> query_embedding) >= min_similarity
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own organization" ON users
  FOR SELECT USING (organization_id = auth.uid());

CREATE POLICY "Organization members can view organization" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Organization members can view assessments" ON assessments
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Functions
CREATE OR REPLACE FUNCTION get_organization_health(org_id UUID)
RETURNS TABLE (
  avg_pci FLOAT,
  avg_iri FLOAT,
  avg_gci FLOAT,
  avg_sli FLOAT,
  respondent_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(ar.pci) as avg_pci,
    AVG(ar.iri) as avg_iri,
    AVG(ar.gci) as avg_gci,
    AVG(ar.sli) as avg_sli,
    COUNT(DISTINCT a.user_id) as respondent_count
  FROM assessments a
  JOIN assessment_results ar ON ar.assessment_id = a.id
  WHERE a.organization_id = org_id
  AND a.status = 'completed';
END;
$$ LANGUAGE plpgsql;
