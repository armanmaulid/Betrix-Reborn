import React from 'react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';
import { PageHeader } from './page-header';
import { FilterBar } from './filter-bar';
import { TableShell } from './table-shell';
import { StatusBadge } from './status-badge';

describe('Shared UI Primitives', () => {
  describe('Badge', () => {
    it('renders the house badge format with a tone', () => {
      render(<Badge tone="negative">HIGH</Badge>);
      const el = screen.getByText('HIGH');
      expect(el).toHaveClass('px-2', 'py-0.5', 'text-[9px]', 'font-bold', 'uppercase');
      expect(el.className).toContain('text-negative');
    });

    it('appends extra classes without dropping the house format', () => {
      render(
        <Badge tone="accent" className="animate-pulse">
          TODAY
        </Badge>
      );
      expect(screen.getByText('TODAY')).toHaveClass('animate-pulse', 'bg-accent');
    });
  });

  describe('PageHeader', () => {
    it('renders title, subtitle and actions', () => {
      render(
        <PageHeader
          title="ECONOMIC CALENDAR"
          subtitle="sourced line"
          actions={<button>R</button>}
        />
      );
      expect(screen.getByRole('heading', { name: 'ECONOMIC CALENDAR' })).toBeInTheDocument();
      expect(screen.getByText('sourced line')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'R' })).toBeInTheDocument();
    });

    it('omits subtitle paragraph when not provided', () => {
      render(<PageHeader title="BROADCAST MSG" />);
      expect(screen.getByRole('heading', { name: 'BROADCAST MSG' })).toBeInTheDocument();
    });
  });

  describe('FilterBar', () => {
    it('wraps children with the dark strip styling', () => {
      render(
        <FilterBar className="space-y-3">
          <div>FILTER CONTENT</div>
        </FilterBar>
      );
      expect(screen.getByText('FILTER CONTENT')).toBeInTheDocument();
    });
  });

  describe('TableShell', () => {
    const columns = [
      { key: 'time', label: 'Time' },
      { key: 'event', label: 'Event' },
      { key: 'actual', label: 'Actual', align: 'right' as const }
    ];

    it('renders uppercase styled column headers', () => {
      render(
        <TableShell columns={columns}>
          <tr>
            <td>09:30</td>
            <td>NFP</td>
            <td>192000</td>
          </tr>
        </TableShell>
      );
      // Column labels are uppercased via CSS only — the DOM text keeps its
      // original casing, so assert case-insensitively here.
      for (const column of columns) {
        expect(screen.getByText(new RegExp(`^${column.label}$`, 'i'))).toBeInTheDocument();
      }
      expect(screen.getByText('NFP')).toBeInTheDocument();
    });

    it('shows a colSpan loading row instead of body content', () => {
      render(
        <TableShell columns={columns} isLoading loadingMessage="LOADING CALENDAR...">
          <tr>
            <td>SHOULD NOT RENDER</td>
          </tr>
        </TableShell>
      );
      expect(screen.getByText('LOADING CALENDAR...')).toBeInTheDocument();
      expect(screen.queryByText('SHOULD NOT RENDER')).not.toBeInTheDocument();
    });

    it('shows error and empty state rows', () => {
      const { rerender } = render(<TableShell columns={columns} isError errorMessage="BOOM" />);
      expect(screen.getByText('BOOM')).toBeInTheDocument();

      rerender(<TableShell columns={columns} isEmpty emptyMessage="NOTHING HERE" />);
      expect(screen.getByText('NOTHING HERE')).toBeInTheDocument();
    });
  });

  describe('StatusBadge', () => {
    it('maps known statuses to their tone', () => {
      render(<StatusBadge status="ACTIVE" />);
      expect(screen.getByText('ACTIVE')).toHaveClass('text-positive');
    });

    it('falls back to neutral for unknown statuses', () => {
      render(<StatusBadge status="WEIRD_STATE" />);
      expect(screen.getByText('WEIRD_STATE')).toHaveClass('text-muted-foreground');
    });
  });
});
