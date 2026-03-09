import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CreatePositionForm from './CreatePositionForm';

describe('CreatePositionForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders all form fields with correct labels', () => {
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Position Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Underlying Symbol/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Strike Price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expiration Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Entry Price/i)).toBeInTheDocument();
  });

  it('shows error messages for all required fields on submit', async () => {
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const submitButton = screen.getByRole('button', { name: /Create Position/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Symbol is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Strike price is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Expiration date is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Quantity is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Entry price is required/i)).toBeInTheDocument();
  });

  it('shows error message on blur when field is empty', async () => {
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const symbolInput = screen.getByLabelText(/Underlying Symbol/i);
    fireEvent.blur(symbolInput);

    expect(await screen.findByText(/Symbol is required/i)).toBeInTheDocument();
  });

  it('validates symbol format', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const symbolInput = screen.getByLabelText(/Underlying Symbol/i);
    await user.type(symbolInput, '!!!');
    fireEvent.blur(symbolInput);

    expect(await screen.findByText(/Invalid symbol format/i)).toBeInTheDocument();
  });

  it('validates that strike must be positive', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const strikeInput = screen.getByLabelText(/Strike Price/i);
    await user.type(strikeInput, '-10');
    fireEvent.blur(strikeInput);

    expect(await screen.findByText(/Strike must be greater than 0/i)).toBeInTheDocument();
  });

  it('validates that expiration date must be in the future', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const expirationInput = screen.getByLabelText(/Expiration Date/i);
    const pastDate = '2020-01-01';
    
    await user.type(expirationInput, pastDate);
    fireEvent.blur(expirationInput);

    expect(await screen.findByText(/Expiration must be in the future/i)).toBeInTheDocument();
  });

  it('validates that quantity must be non-zero', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const qtyInput = screen.getByLabelText(/Quantity/i);
    await user.type(qtyInput, '0');
    fireEvent.blur(qtyInput);

    expect(await screen.findByText(/Quantity must be non-zero/i)).toBeInTheDocument();
  });

  it('validates that entry price must be non-negative', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    const priceInput = screen.getByLabelText(/Entry Price/i);
    await user.type(priceInput, '-5');
    fireEvent.blur(priceInput);

    expect(await screen.findByText(/Entry price must be non-negative/i)).toBeInTheDocument();
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    await user.selectOptions(screen.getByLabelText(/Position Type/i), 'long_call');
    await user.type(screen.getByLabelText(/Underlying Symbol/i), 'btc');
    await user.type(screen.getByLabelText(/Strike Price/i), '50000');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateString = futureDate.toISOString().split('T')[0];
    await user.type(screen.getByLabelText(/Expiration Date/i), dateString);
    
    await user.type(screen.getByLabelText(/Quantity/i), '10');
    await user.type(screen.getByLabelText(/Entry Price/i), '1500');

    fireEvent.click(screen.getByRole('button', { name: /Create Position/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        type: 'long_call',
        symbol: 'BTC', // Should be uppercased
        strike: 50000,
        expiration: dateString,
        quantity: 10,
        entryPrice: 1500,
      });
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CreatePositionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
