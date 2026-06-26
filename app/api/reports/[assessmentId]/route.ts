import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { generateExecutiveSummary, rankClusterPriorities, getTopProtocols } from '@/lib/pig3/recommendations';
import { ClusterAnswer } from '@/lib/pig3/types';

export async function GET(request: NextRequest, { params }: { params: { assessmentId: string } }) {
  try {
    const { assessmentId } = params;

    const { data: assessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select(`*, assessment_results (*), users (full_name, email), organizations (name)`)
      .eq('id', assessmentId)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const { data: answerRows } = await supabaseAdmin
      .from('assessment_answers')
      .select('cluster_id, value')
      .eq('assessment_id', assessmentId);

    const clusterAnswers: ClusterAnswer[] = (answerRows || []).map((r: any) => ({
      clusterId: r.cluster_id,
      value: r.value,
    }));

    const results = assessment.assessment_results;
    const rankedPriorities = rankClusterPriorities(clusterAnswers);
    const topProtocols = getTopProtocols(rankedPriorities);

    const organizationName = assessment.organizations?.name || 'Your Organization';

    const executiveSummary = generateExecutiveSummary(
      organizationName,
      results.pci,
      results.iri,
      results.gci,
      results.sli,
      results.profile_code,
      results.profile_name,
      `${results.state_code} state, ${results.state_urgency} urgency`,
      { rankedPriorities, topProtocols }
    );

    const report = {
      assessmentId: assessment.id,
      date: assessment.completed_at,
      organization: organizationName,
      respondent: assessment.users?.full_name || 'Unknown',
      indices: { pci: results.pci, iri: results.iri, gci: results.gci, sli: results.sli },
      pillarValues: { pValue: results.p_value, iValue: results.i_value, gValue: results.g_value },
      composite: { bpi: results.bpi, bas: results.bas, bfs: results.bfs },
      profile: { code: results.profile_code, name: results.profile_name },
      state: { code: results.state_code, urgency: results.state_urgency },
      recommendations: { rankedPriorities, topProtocols },
      executiveSummary,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
