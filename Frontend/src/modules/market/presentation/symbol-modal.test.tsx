import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SymbolModal } from './symbol-modal';

describe('SymbolModal Component', () => {
  it('should render correctly in add catalog mode', () => {
    render(<SymbolModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} mode="catalog" />);

    expect(screen.getByText('ADD NEW MARKET INSTRUMENT')).toBeInTheDocument();
    expect(screen.getByText(/DUKASCOPY TICKER MAPPING/i)).toBeInTheDocument();
    expect(screen.getByText(/ACTIVE IN MARKET CATALOG/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SAVE INSTRUMENT/i })).toBeInTheDocument();
  });

  it('should render correctly in edit stream mode', () => {
    render(
      <SymbolModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        mode="stream"
        initialData={{
          symbol: 'BTCUSD',
          finnhubSymbol: 'BINANCE:BTCUSDT',
          description: 'Bitcoin / US Dollar',
          category: 'crypto',
          isActive: true
        }}
      />
    );

    expect(screen.getByText('EDIT STREAM SYMBOL // BTCUSD')).toBeInTheDocument();
    expect(screen.getByText(/ENABLE LIVE WEBSOCKET TICK SUBSCRIPTION/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SAVE STREAM SYMBOL/i })).toBeInTheDocument();
    expect(screen.queryByText(/DUKASCOPY TICKER MAPPING/i)).not.toBeInTheDocument();
  });

  it('should submit form data on valid input', async () => {
    const onSave = vi.fn();
    render(<SymbolModal isOpen={true} onClose={vi.fn()} onSave={onSave} mode="catalog" />);

    const symbolInput = screen.getByPlaceholderText('EURUSD');
    fireEvent.change(symbolInput, { target: { value: 'XAUUSD' } });

    const submitBtn = screen.getByRole('button', { name: /SAVE INSTRUMENT/i });
    fireEvent.click(submitBtn);

    // react-hook-form validates asynchronously — wait for the submit handler
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'XAUUSD',
          category: 'forex',
          isActive: true
        })
      )
    );
  });

  it('should reject invalid finnhub ticker format in stream mode', async () => {
    const onSave = vi.fn();
    render(<SymbolModal isOpen={true} onClose={vi.fn()} onSave={onSave} mode="stream" />);

    fireEvent.change(screen.getByPlaceholderText('EURUSD'), { target: { value: 'BTCUSD' } });
    const providerInput = screen.getByPlaceholderText('OANDA:EUR_USD');
    fireEvent.change(providerInput, { target: { value: 'not-a-ticker' } });

    fireEvent.click(screen.getByRole('button', { name: /SAVE STREAM SYMBOL/i }));

    await waitFor(() =>
      expect(screen.getByText(/Format must be EXCHANGE:SYMBOL/i)).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
