import type { Metadata } from 'next';
import { ToastProvider } from '@/shared/presentation/ui/terminal-toast';

export const metadata: Metadata = {
  title: 'TERMINAL AUTH'
};

export default function LoginSegmentLayout({ children }: { children: React.ReactNode }) {
  // Login sits outside DashboardShell's <Providers>, so it needs its own toast
  // host for the session-expired notice (and any future transient feedback).
  return <ToastProvider>{children}</ToastProvider>;
}
