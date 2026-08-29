import { redirect } from 'next/navigation';

/**
 * `/` and `/dashboard` used to both render `DashboardContainer` (duplicate
 * bundle chunk). `/dashboard` is the canonical URL (routes registry, login
 * redirect, sidebar active-state all point there), so the root path is now a
 * plain redirect instead of a second render.
 */
export default function RootDashboardRedirect() {
  redirect('/dashboard');
}
