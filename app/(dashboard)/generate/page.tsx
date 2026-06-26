'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { CONTENT_TYPE_LABELS, ContentType } from '@/lib/pig3/content-generator';
import { Download, Loader2 } from 'lucide-react';

interface AssessmentListItem {
  id: string;
  completed_at: string;
  assessment_results: { profile_code: string; state_code: string; pci: number; iri: number; gci: number; sli: number } | null;
}

export default function GeneratePage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ContentType>('executive_summary');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) fetchAssessments();
  }, [user]);

  async function fetchAssessments() {
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('clerk_id', user?.id)
      .single();
    if (!userData?.organization_id) return;

    const { data } = await supabase
      .from('assessments')
      .select('id, completed_at, assessment_results (profile_code, state_code, pci, iri, gci, sli)')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (data) {
      // assessment_results comes back as an array from the join unless a
      // 1:1 relationship is declared in Supabase; normalize to a single object.
      const normalized = data.map((a: any) => ({
        ...a,
        assessment_results: Array.isArray(a.assessment_results) ? a.assessment_results[0] ?? null : a.assessment_results,
      }));
      setAssessments(normalized);
    }
  }

  const handleGenerate = async () => {
    if (!selectedAssessment) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, assessmentId: selectedAssessment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setGeneratedContent(data.content);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedType}_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Document Generator</h2>
        <p className="text-sm text-ink-muted">
          Generate policies, strategies, SOPs, and more from your PIG³ assessment data. These are deterministic,
          template-based documents — no AI is used to produce them.
        </p>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Select Assessment</label>
            <select
              value={selectedAssessment}
              onChange={(e) => setSelectedAssessment(e.target.value)}
              className="w-full border border-border-light bg-surface-sunken text-ink rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-signal-teal/50"
            >
              <option value="">— Choose —</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Date(a.completed_at).toLocaleDateString()} — Profile: {a.assessment_results?.profile_code ?? '—'} ·
                  PCI {a.assessment_results?.pci ?? '—'} · SLI {a.assessment_results?.sli ?? '—'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-1.5">Document Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ContentType)}
              className="w-full border border-border-light bg-surface-sunken text-ink rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-signal-teal/50"
            >
              {Object.entries(CONTENT_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!selectedAssessment || loading}
          className="px-6 py-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Generating...' : 'Generate Document'}
        </button>

        {error && <p className="mt-2 text-signal-rose text-sm">{error}</p>}
      </div>

      {generatedContent && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink">{CONTENT_TYPE_LABELS[selectedType]}</h3>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-signal-teal text-canvas rounded-lg hover:bg-signal-teal/90 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              Download Markdown
            </button>
          </div>
          <div className="bg-canvas border border-border rounded-lg overflow-auto max-h-[600px]">
            <pre className="p-4 whitespace-pre-wrap text-sm text-ink-muted font-mono leading-relaxed">{generatedContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
