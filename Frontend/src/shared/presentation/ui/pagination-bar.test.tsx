import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PaginationBar } from './pagination-bar';

describe('PaginationBar Component', () => {
  it('should render current page and total pages', () => {
    render(<PaginationBar page={2} totalPages={5} onPageChange={vi.fn()} />);

    expect(screen.getByText(/PAGE/i)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onPageChange when clicking next and prev buttons', () => {
    const onPageChange = vi.fn();
    render(<PaginationBar page={2} totalPages={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByLabelText('Previous Page');
    const nextButton = screen.getByLabelText('Next Page');

    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should disable prev button on first page and next button on last page', () => {
    const { rerender } = render(<PaginationBar page={1} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByLabelText('Previous Page')).toBeDisabled();
    expect(screen.getByLabelText('Next Page')).not.toBeDisabled();

    rerender(<PaginationBar page={3} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByLabelText('Previous Page')).not.toBeDisabled();
    expect(screen.getByLabelText('Next Page')).toBeDisabled();
  });

  it('should handle rows per page selector when limit and onLimitChange are provided', () => {
    const onLimitChange = vi.fn();
    render(
      <PaginationBar
        page={1}
        totalPages={10}
        onPageChange={vi.fn()}
        limit={25}
        onLimitChange={onLimitChange}
        limitOptions={[10, 25, 50, 100]}
      />
    );

    expect(screen.getByText('ROWS PER PAGE:')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('25');

    fireEvent.change(select, { target: { value: '50' } });
    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('should display total count with custom label if provided', () => {
    render(
      <PaginationBar
        page={1}
        totalPages={4}
        onPageChange={vi.fn()}
        total={1250}
        totalLabel="TOTAL USERS"
      />
    );

    expect(screen.getByText('TOTAL USERS:')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('should render null if hideIfSinglePage is true and totalPages <= 1', () => {
    const { container } = render(
      <PaginationBar page={1} totalPages={1} onPageChange={vi.fn()} hideIfSinglePage={true} />
    );

    expect(container.firstChild).toBeNull();
  });
});
