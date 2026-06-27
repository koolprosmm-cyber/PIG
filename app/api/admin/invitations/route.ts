import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'

function isAuthed() {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')
  const adminPassword = process.env.ADMIN_PASSWORD
  return adminPassword && session?.value === adminPassword
}

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('id, email, role, status, created_at, expires_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invitationId, status } = await request.json()
  if (!invitationId || status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
