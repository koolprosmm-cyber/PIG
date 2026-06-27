import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const payload = await request.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as typeof event;
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = event.data as {
      id: string;
      email_addresses: { email_address: string }[];
      first_name?: string;
      last_name?: string;
    };

    const email = email_addresses[0]?.email_address;
    if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

    const fullName = `${first_name ?? ''} ${last_name ?? ''}`.trim() || email;

    // Create organization for the new user
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({ name: `${fullName}'s Organization` })
      .select('id')
      .single();

    if (orgErr || !org) {
      return NextResponse.json({ error: orgErr?.message ?? 'Failed to create org' }, { status: 500 });
    }

    // Create user row
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_id: id,
        email,
        full_name: fullName,
        organization_id: org.id,
      })
      .select('id')
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: userErr?.message ?? 'Failed to create user' }, { status: 500 });
    }

    // Create organization_members row as owner
    const { error: memberErr } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberErr) {
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
