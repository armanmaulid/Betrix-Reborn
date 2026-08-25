import { NextRequest } from 'next/server';
import { proxyGet } from '@/app/api/proxy-utils';

export async function GET(request: NextRequest) {
  return proxyGet(request, { prefix: 'calendar' });
}
