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

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  reactStrictMode: true,
  reactCompiler: true,
  allowedDevOrigins: getDynamicDevOrigins(),
  logging: {
    fetches: {
      // Never log full fetch URLs in production — they may contain query secrets.
      // Only enabled in development via NEXT_PUBLIC_DEBUG_LOGS=true.
      fullUrl: process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true'
    }
  }
};

export default nextConfig;
