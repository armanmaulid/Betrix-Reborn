import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/shared/presentation/layout/dashboard-shell';

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('betrix_admin_token')?.value;

  if (!token) {
    redirect('/login');
  }

  return <DashboardShell>{children}</DashboardShell>;
}
