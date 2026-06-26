import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const VALID_ROLES = ['owner', 'admin', 'manager', 'staff'];

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId, role } = await request.json();
  if (!memberId || !role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify caller is admin or owner in the same org as the target member
  const { data: callerUser } = await supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('clerk_id', userId)
    .single();
  if (!callerUser?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: callerMembership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('organization_id', callerUser.organization_id)
    .eq('user_id', (await supabaseAdmin.from('users').select('id').eq('clerk_id', userId).single()).data?.id)
    .single();

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify target member belongs to same org
  const { data: targetMember } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('id', memberId)
    .single();

  if (!targetMember || targetMember.organization_id !== callerUser.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .update({ role })
    .eq('id', memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
