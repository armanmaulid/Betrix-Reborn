import { ValidationError } from '@betrix/core';
import { DeviceFingerprint } from '@betrix/domain';

interface DeviceContext {
  ip?: string;
  userAgent?: string | undefined;
}

/**
 * Resolve the AUTHORITATIVE device fingerprint for ADR-05 1:1 binding.
 *
 * Security: a client-supplied fingerprint is a self-reported string that can
 * be randomized per request, defeating device binding entirely — or crafted
 * to pre-bind a victim's fingerprint and lock them out (targeted DoS).
 *
 * Resolution order:
 *  1. Server-derived: sha256(request.ip | user-agent) — cannot be spoofed by
 *     the client body (requires trusted-proxy config to see real client IPs,
 *     which is the deployment's responsibility via TRUST_PROXY).
 *  2. Legacy fallback: the DTO value — only used when no server context was
 *     provided (internal calls / older clients), preserving compatibility.
 */
export function resolveServerFingerprint(
  dtoFingerprint: string | undefined,
  context?: DeviceContext
): string {
  if (context?.ip && context?.userAgent) {
    return DeviceFingerprint.fromRequest(context.ip, context.userAgent).value;
  }
  if (dtoFingerprint && dtoFingerprint.trim().length > 0) {
    return dtoFingerprint;
  }
  throw new ValidationError(
    'Device context is required: provide request IP/user-agent or a device fingerprint.'
  );
}
