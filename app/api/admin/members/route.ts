import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase/server'

function isAuthed() {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')
  const adminPassword = process.env.ADMIN_PASSWORD
  return adminPassword && session?.value === adminPassword
}

const VALID_ROLES = ['owner', 'admin', 'manager', 'staff']

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('id, role, user_id, organization_id, users (full_name, email)')
    .order('role')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { memberId, role } = await request.json()
  if (!memberId || !role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
