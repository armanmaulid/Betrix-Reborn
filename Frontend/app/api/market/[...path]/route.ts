import { NextRequest } from 'next/server';
import { proxyGet } from '@/app/api/proxy-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyGet(request, { prefix: 'market', pathSegments: path });
}
