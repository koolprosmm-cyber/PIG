import { NextResponse } from 'next/server'
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

  const [{ count: kbCount }, { data: kbLatest }] = await Promise.all([
    supabaseAdmin.from('knowledge_base').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('knowledge_base').select('created_at').order('created_at', { ascending: false }).limit(1),
  ])

  return NextResponse.json({
    kb: {
      count: kbCount ?? 0,
      lastUpdated: kbLatest?.[0]?.created_at ?? null,
    },
  })
}
