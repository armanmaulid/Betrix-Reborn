'use client';

import React from 'react';
import { UtcClockDisplay } from '../use-utc-clock';

export const UtcClockItem = React.memo(function UtcClockItem() {
  return <UtcClockDisplay />;
});
