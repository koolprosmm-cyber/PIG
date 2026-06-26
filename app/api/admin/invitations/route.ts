import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { invitationId, status } = await request.json();
  if (!invitationId || status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Verify caller is admin or owner
  const { data: callerUser } = await supabaseAdmin
    .from('users')
    .select('id, organization_id')
    .eq('clerk_id', userId)
    .single();
  if (!callerUser?.organization_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { data: callerMembership } = await supabaseAdmin
    .from('organization_members')
    .select('role')
    .eq('organization_id', callerUser.organization_id)
    .eq('user_id', callerUser.id)
    .single();

  if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify invitation belongs to caller's org
  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('organization_id')
    .eq('id', invitationId)
    .single();

  if (!invitation || invitation.organization_id !== callerUser.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
