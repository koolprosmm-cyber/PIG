'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { AssessmentResult, ClusterAnswer } from '@/lib/pig3/types';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const supabase = useSupabase();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (organizationId) {
      createSession();
    }
  }, [organizationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchData() {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('clerk_id', user?.id)
        .single();
      if (!userData) return;
      setOrganizationId(userData.organization_id);

      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', userData.organization_id)
        .single();
      if (orgData) setOrganizationName(orgData.name);

      const { data: assessments } = await supabase
        .from('assessments')
        .select('id')
        .eq('organization_id', userData.organization_id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (assessments && assessments.length > 0) {
        const assessmentId = assessments[0].id;

        const { data: answerRows } = await supabase
          .from('assessment_answers')
          .select('cluster_id, value')
          .eq('assessment_id', assessmentId);

        const { data: resultRow } = await supabase
          .from('assessment_results')
          .select('*')
          .eq('assessment_id', assessmentId)
          .single();

        if (resultRow && answerRows) {
          const clusterAnswers: ClusterAnswer[] = answerRows.map((r: any) => ({
            clusterId: r.cluster_id,
            value: r.value,
          }));

          setResult({
            clusterAnswers,
            indices: { pci: resultRow.pci, iri: resultRow.iri, gci: resultRow.gci, sli: resultRow.sli },
            pillarValues: { pValue: resultRow.p_value, iValue: resultRow.i_value, gValue: resultRow.g_value },
            pillarClassification: {
              p: resultRow.p_value >= 3.5 ? 'S' : resultRow.p_value >= 3.0 ? 'M' : 'W',
              i: resultRow.i_value >= 3.5 ? 'S' : resultRow.i_value >= 3.0 ? 'M' : 'W',
              g: resultRow.g_value >= 3.5 ? 'S' : resultRow.g_value >= 3.0 ? 'M' : 'W',
            },
            profile: { code: resultRow.profile_code, name: resultRow.profile_name, description: '' },
            state: { code: resultRow.state_code, urgency: resultRow.state_urgency, description: '' },
            composite: { bpi: resultRow.bpi, bas: resultRow.bas, bfs: resultRow.bfs },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  async function createSession() {
    const { data } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user?.id,
        organization_id: organizationId,
        title: 'New Conversation',
      })
      .select()
      .single();

    if (data) setSessionId(data.id);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const questionText = input;
    setInput('');
    setLoading(true);

    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage.content,
      });

      const coachResponse = await fetch('/api/chat/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          result,
          organizationName,
          organizationId: organizationId ?? undefined,
        }),
      });

      if (!coachResponse.ok) {
        throw new Error(`AI Coach request failed: ${coachResponse.status}`);
      }

      const { answer: aiResponse } = await coachResponse.json();

      const assistantMessage: Message = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantMessage.content,
        token_count: Math.round(aiResponse.length / 4),
      });
    } catch (error) {
      console.error('Error in chat:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-73px)] card overflow-hidden">
      <ChatSidebar onSelectSession={() => {}} onNewSession={() => {}} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-ink">AI Coach</h2>
            <p className="text-xs text-ink-muted">Ask questions about your PIG³ structural health results</p>
          </div>
          {result ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-signal-teal/10 text-signal-teal border border-signal-teal/20">
              Assessment loaded
            </span>
          ) : (
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-raised text-ink-faint border border-border">
              No assessment data
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 text-ink-muted">
              <p className="font-medium text-ink">Ask me anything about your structural health results</p>
              <p className="text-sm mt-1 text-ink-muted">Try: "Why is our Institutions score lower than Governance?"</p>
            </div>
          )}

          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-ink-muted">
              <div className="w-2 h-2 bg-signal-teal rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-signal-teal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-signal-teal rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-5 py-4 border-t border-border">
          <ChatInput value={input} onChange={setInput} onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </div>
  );
}
