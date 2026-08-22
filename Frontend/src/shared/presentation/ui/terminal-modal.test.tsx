import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TerminalModal } from './terminal-modal';
import { Terminal } from 'lucide-react';

describe('TerminalModal Component', () => {
  it('should not render anything when isOpen is false', () => {
    render(
      <TerminalModal isOpen={false} onClose={vi.fn()} title="TEST MODAL">
        <div>Modal Content</div>
      </TerminalModal>
    );

    expect(screen.queryByText('TEST MODAL')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  it('should render title and children when isOpen is true', () => {
    render(
      <TerminalModal
        isOpen={true}
        onClose={vi.fn()}
        title="SYSTEM DIAGNOSTICS"
        icon={Terminal}
        variant="accent"
      >
        <div>Diagnostics Running...</div>
      </TerminalModal>
    );

    expect(screen.getByText('SYSTEM DIAGNOSTICS')).toBeInTheDocument();
    expect(screen.getByText('Diagnostics Running...')).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(
      <TerminalModal isOpen={true} onClose={onClose} title="TEST MODAL">
        <div>Content</div>
      </TerminalModal>
    );

    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <TerminalModal isOpen={true} onClose={onClose} title="TEST MODAL" closeOnEscape={true}>
        <div>Content</div>
      </TerminalModal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render footer when provided', () => {
    render(
      <TerminalModal
        isOpen={true}
        onClose={vi.fn()}
        title="TEST MODAL"
        footer={<button>SAVE ACTION</button>}
      >
        <div>Content</div>
      </TerminalModal>
    );

    expect(screen.getByText('SAVE ACTION')).toBeInTheDocument();
  });
});
