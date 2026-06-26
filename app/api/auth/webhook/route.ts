import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, data } = body;

  if (type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = data;
    const email = email_addresses[0].email_address;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();

    // Store user in Supabase
    await supabaseAdmin.from('users').insert({
      clerk_id: id,
      email: email,
      full_name: fullName || email,
      role: 'staff'
    });
  }

  return NextResponse.json({ success: true });
}
