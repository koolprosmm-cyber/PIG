// app/api/chat/coach/route.ts
//
// SECURITY FIX: the original draft called generateAICoachResponse() (which
// constructs an OpenAI client using OPENAI_API_KEY) directly from a
// 'use client' page (app/(dashboard)/chat/page.tsx). In a client component,
// that either silently fails (process.env.OPENAI_API_KEY is undefined in
// the browser) or, if someone "fixed" it by exposing the key via a
// NEXT_PUBLIC_ prefix, would ship a secret API key to every visitor's
// browser. Adding retrieval.ts's supabaseAdmin (service-role) call into
// that same chain made the risk concrete and severe.
//
// FIX: all AI Coach logic now runs here, server-side, behind this route.
// The client page calls this route via fetch() and never touches
// OPENAI_API_KEY or SUPABASE_SERVICE_ROLE_KEY directly.

import { NextRequest, NextResponse } from 'next/server';
import { generateAICoachResponse } from '@/lib/ai/openai';
import { AssessmentResult } from '@/lib/pig3/types';

interface RequestBody {
  question: string;
  result: AssessmentResult | null;
  organizationName: string;
  organizationId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { question, result, organizationName, organizationId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'A question is required.' }, { status: 400 });
    }

    const answer = await generateAICoachResponse(question, result, organizationName || 'Your Organization', organizationId);

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('AI Coach route error:', error);
    return NextResponse.json(
      { error: 'I apologize, but I encountered an error. Please try again later.' },
      { status: 500 }
    );
  }
}
