// app/api/content/generate/route.ts
//
// CORRECTED: the original draft read pm1_score...pm7_score, overall_health,
// traffic_light columns that don't exist in the real schema, and called
// generateRecommendations(scores) where scores was the wrong shape entirely
// (generateRecommendations actually takes ClusterAnswer[], not a scores
// object — see lib/pig3/recommendations.ts). This version reconstructs the
// real AssessmentResult from the actual assessment_results columns
// (pci/iri/gci/sli, profile_code, state_code, etc.) and real
// assessment_answers rows, following the same pattern already used in
// app/(dashboard)/dashboard/page.tsx and app/(dashboard)/chat/page.tsx.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateContent, ContentType, CONTENT_TYPE_LABELS } from '@/lib/pig3/content-generator';
import { rankClusterPriorities, getTopProtocols } from '@/lib/pig3/recommendations';
import { AssessmentResult, ClusterAnswer } from '@/lib/pig3/types';

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { type, assessmentId } = await request.json();

    if (!type || !assessmentId) {
      return NextResponse.json({ error: 'type and assessmentId required' }, { status: 400 });
    }

    if (!Object.keys(CONTENT_TYPE_LABELS).includes(type)) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('clerk_id', userId)
      .single();

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }

    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name, industry, size')
      .eq('id', userData.organization_id)
      .single();

    const { data: assessment } = await supabaseAdmin
      .from('assessments')
      .select('*, assessment_results (*)')
      .eq('id', assessmentId)
      .eq('organization_id', userData.organization_id)
      .single();

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const resultsRow = Array.isArray(assessment.assessment_results)
      ? assessment.assessment_results[0]
      : assessment.assessment_results;

    if (!resultsRow) {
      return NextResponse.json({ error: 'Assessment has no results yet' }, { status: 404 });
    }

    const { data: answerRows } = await supabaseAdmin
      .from('assessment_answers')
      .select('cluster_id, value')
      .eq('assessment_id', assessmentId);

    const clusterAnswers: ClusterAnswer[] = (answerRows || []).map((r: any) => ({
      clusterId: r.cluster_id,
      value: r.value,
    }));

    const result: AssessmentResult = {
      clusterAnswers,
      indices: { pci: resultsRow.pci, iri: resultsRow.iri, gci: resultsRow.gci, sli: resultsRow.sli },
      pillarValues: { pValue: resultsRow.p_value, iValue: resultsRow.i_value, gValue: resultsRow.g_value },
      pillarClassification: {
        p: resultsRow.p_value >= 3.5 ? 'S' : resultsRow.p_value >= 3.0 ? 'M' : 'W',
        i: resultsRow.i_value >= 3.5 ? 'S' : resultsRow.i_value >= 3.0 ? 'M' : 'W',
        g: resultsRow.g_value >= 3.5 ? 'S' : resultsRow.g_value >= 3.0 ? 'M' : 'W',
      },
      profile: { code: resultsRow.profile_code, name: resultsRow.profile_name, description: '' },
      state: { code: resultsRow.state_code, urgency: resultsRow.state_urgency, description: '' },
      composite: { bpi: resultsRow.bpi, bas: resultsRow.bas, bfs: resultsRow.bfs },
    };

    // Recommendations are derived live from the real cluster answers,
    // exactly as the dashboard/chat pages already do — this keeps a single
    // source of truth rather than trusting a possibly-stale stored copy.
    const rankedPriorities = rankClusterPriorities(clusterAnswers);
    const topProtocols = getTopProtocols(rankedPriorities);

    const content = generateContent({
      type: type as ContentType,
      result,
      recommendations: { rankedPriorities, topProtocols },
      organizationName: org?.name || 'Your Organization',
      industry: org?.industry,
      size: org?.size,
    });

    return NextResponse.json({
      content,
      title: CONTENT_TYPE_LABELS[type as ContentType],
      organizationName: org?.name,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Content generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}
