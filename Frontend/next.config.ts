import type { NextConfig } from 'next';
import os from 'node:os';

/**
 * Dynamically extract all active non-internal IPv4 addresses from host network interfaces.
 * This guarantees DHCP-assigned dynamic router IPs, Tailscale IPs, and WiFi IPs are
 * automatically allowed in dev mode without any hardcoded values.
 */
function getDynamicDevOrigins(): string[] {
  const origins = new Set<string>(['localhost', '127.0.0.1']);
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        origins.add(net.address);
      }
    }
  }

  return Array.from(origins);
}

// `unsafe-eval` is required by Next.js dev tooling (react-refresh/HMR) but has
// no business in production — it largely defeats the XSS mitigation value of
// the CSP. Inline scripts remain necessary for Next's bootstrap runtime.
const scriptSrc =
  process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  }
];

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  reactStrictMode: true,
  reactCompiler: true,
  poweredByHeader: false,
  experimental: {
    // `typescript` resolves to the TS6 API package (@typescript/typescript6) for the
    // linter; Next's API-mode typecheck uses it. The native `tsc` bin stays TS7 via
    // the @typescript/native alias. See eslint.config.mjs / package.json.
    useTypeScriptCli: false
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  },
  allowedDevOrigins: getDynamicDevOrigins(),
  logging: {
    fetches: {
      // Never log full fetch URLs in production — they may contain query secrets.
      // Only enabled in development via NEXT_PUBLIC_DEBUG_LOGS=true.
      fullUrl:
        process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true'
    }
  }
};

export default nextConfig;
