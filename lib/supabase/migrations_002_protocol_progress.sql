-- lib/supabase/migrations_002_protocol_progress.sql
--
-- Run this AFTER migrations.sql (which creates assessment_results).
-- Adds protocol progress tracking for the Roadmap feature.

-- 13. Protocol Progress
-- Tracks Not started / In progress / Complete status for each recommended
-- protocol per assessment result. One row per (assessment_result_id, protocol_id).
CREATE TABLE protocol_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_result_id UUID REFERENCES assessment_results(id) ON DELETE CASCADE,
  protocol_id VARCHAR(5) NOT NULL,        -- e.g. 'G-1', 'L-4'
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(assessment_result_id, protocol_id)
);

ALTER TABLE protocol_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can manage their protocol progress" ON protocol_progress
  FOR ALL USING (
    assessment_result_id IN (
      SELECT ar.id FROM assessment_results ar
      JOIN assessments a ON a.id = ar.assessment_id
      JOIN organization_members om ON om.organization_id = a.organization_id
      WHERE om.user_id = auth.uid()
    )
  );
