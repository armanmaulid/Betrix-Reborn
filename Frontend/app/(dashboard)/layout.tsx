import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/shared/presentation/layout/dashboard-shell';
import { verifySession } from '@/lib/server-auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('betrix_admin_token')?.value ?? null;

  if (!token) {
    redirect('/login');
  }

  const user = await verifySession(token);
  if (!user) {
    // Hand off to a Route Handler: only there can the httpOnly cookie be
    // deleted. Doing it here throws "Cookies can only be modified in a Server
    // Action or Route Handler", and skipping it leaves a stale cookie that
    // makes proxy.ts bounce /login straight back here (infinite loop).
    redirect('/api/auth/clear-session');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
