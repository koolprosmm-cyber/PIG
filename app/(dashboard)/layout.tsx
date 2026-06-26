'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Map,
  CalendarDays,
  Activity,
  MessageSquare,
  FileText,
  FilePlus2,
  Settings,
  LogOut,
  User,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const navItems = [
    { href: '/chat', label: 'AI Coach', icon: MessageSquare },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/assessments', label: 'Assessments', icon: ClipboardList },
    { href: '/scenarios', label: 'Scenarios', icon: TrendingUp },
    { href: '/roadmap', label: 'Roadmap', icon: Map },
    { href: '/plan', label: '90-Day Plan', icon: CalendarDays },
    { href: '/monitoring', label: 'Monitoring', icon: Activity },
    { href: '/reports', label: 'Reports', icon: FileText },
    { href: '/generate', label: 'Generate', icon: FilePlus2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-canvas">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-semibold text-ink tracking-tight">
            PIG<span className="text-signal-teal">³</span>
          </h1>
          <p className="text-xs text-ink-faint mt-0.5 uppercase tracking-wide">Org Intelligence</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                  ${isActive
                    ? 'bg-signal-teal/10 text-signal-teal font-medium'
                    : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-surface-raised border border-border-light flex items-center justify-center">
              <User className="w-4 h-4 text-signal-teal" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{user?.fullName || user?.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-ink-faint truncate">Owner</p>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 hover:bg-surface-raised rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 text-ink-faint" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-border px-6 py-3.5 flex items-center justify-between">
          <h2 className="text-base font-medium text-ink">
            {navItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/'))?.label || 'Dashboard'}
          </h2>
          <div />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
