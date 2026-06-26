'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { CLUSTERS, CLUSTER_ORDER, getClustersByCategory } from '@/lib/pig3/clusters';
import { calculateFullAssessment } from '@/lib/pig3/scoring';
import { generateRecommendations } from '@/lib/pig3/recommendations';
import { ClusterAnswer, ClusterCategory } from '@/lib/pig3/types';
import { AssessmentQuestion } from '@/components/assessment/AssessmentQuestion';
import { AssessmentProgress } from '@/components/assessment/AssessmentProgress';
import { AssessmentSummary } from '@/components/assessment/AssessmentSummary';

export default function NewAssessmentPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<ClusterAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchOrganization();
  }, [user]);

  async function fetchOrganization() {
    const { data } = await supabase.from('users').select('organization_id').eq('clerk_id', user?.id).single();
    if (data) setOrganizationId(data.organization_id);
  }

  const totalQuestions = CLUSTER_ORDER.length; // 29
  const currentCluster = CLUSTERS[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const handleAnswer = (value: number) => {
    const existingIndex = answers.findIndex(a => a.clusterId === currentCluster.id);
    if (existingIndex >= 0) {
      const updated = [...answers];
      updated[existingIndex] = { clusterId: currentCluster.id, value };
      setAnswers(updated);
    } else {
      setAnswers([...answers, { clusterId: currentCluster.id, value }]);
    }
  };

  const getCurrentAnswer = () => {
    const existing = answers.find(a => a.clusterId === currentCluster.id);
    return existing ? existing.value : null;
  };

  const getCategoryProgress = (): Record<ClusterCategory, number> => {
    const categories: ClusterCategory[] = ['Policy', 'Institutions', 'Governance', 'CrossCutting'];
    const result: Record<string, number> = {};
    categories.forEach(cat => {
      const ids = getClustersByCategory(cat).map(c => c.id);
      const answered = answers.filter(a => ids.includes(a.clusterId)).length;
      result[cat] = Math.round((answered / ids.length) * 100);
    });
    return result as Record<ClusterCategory, number>;
  };

  const handleNext = () => {
    if (isLastQuestion) handleSubmit();
    else setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSubmit = async () => {
    if (answers.length !== totalQuestions) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const result = calculateFullAssessment(answers);
      const recommendations = generateRecommendations(answers);

      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          organization_id: organizationId,
          user_id: user?.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (assessmentError) throw assessmentError;

      const answersToInsert = answers.map(a => ({
        assessment_id: assessment.id,
        cluster_id: a.clusterId,
        value: a.value,
      }));
      const { error: answersError } = await supabase.from('assessment_answers').insert(answersToInsert);
      if (answersError) throw answersError;

      const { data: resultRow, error: resultsError } = await supabase
        .from('assessment_results')
        .insert({
          assessment_id: assessment.id,
          pci: result.indices.pci,
          iri: result.indices.iri,
          gci: result.indices.gci,
          sli: result.indices.sli,
          p_value: result.pillarValues.pValue,
          i_value: result.pillarValues.iValue,
          g_value: result.pillarValues.gValue,
          bpi: result.composite.bpi,
          bas: result.composite.bas,
          bfs: result.composite.bfs,
          profile_code: result.profile.code,
          profile_name: result.profile.name,
          state_code: result.state.code,
          state_urgency: result.state.urgency,
        })
        .select()
        .single();
      if (resultsError) throw resultsError;

      const { error: recError } = await supabase.from('recommendations').insert({
        assessment_result_id: resultRow.id,
        ranked_priorities: recommendations.rankedPriorities,
        top_protocols: recommendations.topProtocols,
      });
      if (recError) throw recError;

      setResults({ result, recommendations });
      setShowSummary(true);
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('There was an error submitting your assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (showSummary && results) {
    return <AssessmentSummary result={results.result} recommendations={results.recommendations} />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">PIG³ Organizational Health Assessment</h2>
          <p className="text-sm text-ink-muted mt-1">
            v1 lightweight version — {totalQuestions} questions, one per PIG³ cluster, across Policy, Institutions,
            Governance, and Cross-Cutting Variables.
          </p>
        </div>

        <div className="p-6">
          <AssessmentProgress current={currentIndex + 1} total={totalQuestions} categoryProgress={getCategoryProgress()} />

          <div className="mt-8">
            <AssessmentQuestion cluster={currentCluster} currentAnswer={getCurrentAnswer()} onAnswer={handleAnswer} />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="px-4 py-2 text-sm font-medium text-ink-muted border border-border rounded-lg hover:bg-surface-raised hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Back
              </button>
              <a href="/assessments" className="text-sm text-ink-faint hover:text-ink-muted transition-colors">
                Cancel
              </a>
            </div>
            <button
              onClick={handleNext}
              disabled={getCurrentAnswer() === null || submitting}
              className="px-6 py-2 text-sm font-medium bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : isLastQuestion ? 'Submit Assessment' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
