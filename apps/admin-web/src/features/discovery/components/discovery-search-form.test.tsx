import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiscoverySearchForm } from './discovery-search-form';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiscoverySearchForm />
    </QueryClientProvider>,
  );
}

// Integration test: the real RHF + Zod wiring against the exact backend
// schema (createDiscoveryJobSchema), plus CategoryInput and the mutation
// hook, composed together — not any one piece in isolation.
describe('DiscoverySearchForm', () => {
  it('blocks submission and shows validation errors for an empty city and no categories', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Start Search' }));

    expect(await screen.findByText(/city/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits city/categories/radius exactly matching createDiscoveryJobSchema on success', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        [{ id: '1', city: 'Karachi', category: 'restaurant', status: 'queued', resultsCount: 0 }],
        201,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('City'), 'Karachi');
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Add a category' }),
      'restaurant{enter}',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start Search' }));

    await screen.findByRole('button', { name: 'Start Search' }); // settles after submit
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/discovery-jobs'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ city: 'Karachi', categories: ['restaurant'], radiusKm: 15 }),
      }),
    );
  });

  it('rejects a radius above 50 (createDiscoveryJobSchema max)', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('City'), 'Karachi');
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Add a category' }),
      'restaurant{enter}',
    );
    const radiusInput = screen.getByLabelText('Radius (km)');
    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, '75');
    await userEvent.click(screen.getByRole('button', { name: 'Start Search' }));

    expect(await screen.findByText(/radius/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
