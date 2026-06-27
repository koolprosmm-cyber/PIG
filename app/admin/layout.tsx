import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const session = cookieStore.get('admin_session')
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword || !session || session.value !== adminPassword) {
    redirect('/admin-login')
  }

  return <>{children}</>
}
