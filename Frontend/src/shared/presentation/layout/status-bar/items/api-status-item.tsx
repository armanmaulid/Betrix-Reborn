'use client';

import React from 'react';
import { useApiPing } from '../use-api-ping';

export const ApiStatusItem = React.memo(function ApiStatusItem() {
  const { apiStatus, latencyMs } = useApiPing(30000);

  return (
    <div className="flex items-center space-x-1.5 shrink-0" title={`API Gateway: ${apiStatus.toUpperCase()}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full inline-block ${
          apiStatus === 'online'
            ? 'bg-positive animate-pulse'
            : apiStatus === 'connecting'
            ? 'bg-accent animate-ping'
            : 'bg-negative'
        }`}
      />
      <span className="text-muted-foreground">API:</span>
      <span
        className={`font-bold ${
          apiStatus === 'online'
            ? 'text-positive'
            : apiStatus === 'connecting'
            ? 'text-accent'
            : 'text-negative'
        }`}
      >
        {apiStatus === 'online'
          ? `ONLINE${latencyMs !== null ? ` (${latencyMs}ms)` : ''}`
          : apiStatus === 'connecting'
          ? 'CONNECTING...'
          : 'OFFLINE'}
      </span>
    </div>
  );
});
