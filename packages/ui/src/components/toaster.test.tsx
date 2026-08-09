import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toast, Toaster } from './toaster';

describe('Toaster', () => {
  it('renders without crashing, mounting the sonner viewport', () => {
    render(<Toaster />);
    // sonner portals its notification region onto document.body, not the
    // render container — queried by its own accessible name/role rather
    // than an internal DOM attribute, which varies across sonner versions.
    expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
  });

  it('re-exports the sonner `toast` function as the single seam every app should call through', () => {
    expect(typeof toast).toBe('function');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
  });
});
