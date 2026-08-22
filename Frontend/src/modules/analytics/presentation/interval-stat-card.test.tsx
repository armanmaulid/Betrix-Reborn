import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserPlus } from 'lucide-react';
import { IntervalStatCard } from './interval-stat-card';

describe('IntervalStatCard Component', () => {
  const sampleOptions = [
    {
      key: 'today',
      label: 'TODAY',
      shortLabel: 'TODAY',
      value: 12,
      description: 'SINCE 00:00 UTC'
    },
    {
      key: 'week',
      label: 'WEEK',
      shortLabel: 'WEEK',
      value: 48,
      description: 'ROLLING 7-DAY INTERVAL'
    },
    {
      key: 'month',
      label: 'MONTH',
      shortLabel: 'MONTH',
      value: 230,
      description: 'ROLLING 30-DAY INTERVAL'
    }
  ];

  it('should render title and currently selected interval value', () => {
    render(
      <IntervalStatCard
        title="NEW REGISTRATIONS"
        icon={UserPlus}
        options={sampleOptions}
        selectedInterval="today"
        onSelectInterval={vi.fn()}
        prefix="+"
      />
    );

    expect(screen.getByText('NEW REGISTRATIONS')).toBeInTheDocument();
    expect(screen.getAllByText('+12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('SINCE 00:00 UTC')).toBeInTheDocument();
  });

  it('should allow switching intervals via buttons and sub-chips', () => {
    const onSelect = vi.fn();
    render(
      <IntervalStatCard
        title="NEW REGISTRATIONS"
        icon={UserPlus}
        options={sampleOptions}
        selectedInterval="today"
        onSelectInterval={onSelect}
        prefix="+"
      />
    );

    const weekButtons = screen.getAllByText('WEEK');
    fireEvent.click(weekButtons[0]);
    expect(onSelect).toHaveBeenCalledWith('week');

    const monthButtons = screen.getAllByText('MONTH');
    fireEvent.click(monthButtons[1]); // chip click
    expect(onSelect).toHaveBeenCalledWith('month');
  });

  it('should render values formatted properly with custom prefix', () => {
    render(
      <IntervalStatCard
        title="NEW REGISTRATIONS"
        icon={UserPlus}
        options={sampleOptions}
        selectedInterval="month"
        onSelectInterval={vi.fn()}
        prefix="+"
      />
    );

    expect(screen.getAllByText('+230').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ROLLING 30-DAY INTERVAL')).toBeInTheDocument();
  });
});
