'use client';

import React from 'react';
import { Shield } from 'lucide-react';

export const AuthStatusItem = React.memo(function AuthStatusItem() {
  return (
    <div
      className="hidden xl:flex items-center space-x-1.5 shrink-0"
      title="Authentication: Cryptographic JWT Cookie + HttpOnly Defense-in-Depth"
    >
      <Shield className="w-2.5 h-2.5 text-positive" />
      <span className="text-muted-foreground">AUTH:</span>
      <span className="text-positive font-bold">JWT/HTTPONLY</span>
    </div>
  );
});
