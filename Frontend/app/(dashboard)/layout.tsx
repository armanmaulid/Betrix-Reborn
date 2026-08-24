import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/shared/presentation/layout/dashboard-shell';
import { verifySession } from '@/lib/server-auth';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('betrix_admin_token')?.value ?? null;

  if (!token) {
    redirect('/login');
  }

  const user = await verifySession(token);
  if (!user) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
