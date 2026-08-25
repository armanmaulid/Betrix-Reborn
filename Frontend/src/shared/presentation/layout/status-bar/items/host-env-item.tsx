'use client';

import React from 'react';
import { Cpu } from 'lucide-react';

export const HostEnvItem = React.memo(function HostEnvItem() {
  const isProd = process.env.NODE_ENV === 'production';

  return (
    <div
      className="hidden 2xl:flex items-center space-x-1.5 shrink-0"
      title={`Host Environment: ${isProd ? 'PROD // CLOUD' : 'DEV // LOCAL'}`}
    >
      <Cpu className="w-2.5 h-2.5 text-foreground" />
      <span className="text-muted-foreground">ENV:</span>
      <span className="text-foreground font-bold">{isProd ? 'PROD' : 'DEV'}</span>
    </div>
  );
});
