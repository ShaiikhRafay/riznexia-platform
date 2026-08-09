import { Toaster } from '@riznexia/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSyncSearchForm } from './place-sync-search-form';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

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
      <PlaceSyncSearchForm />
      <Toaster />
    </QueryClientProvider>,
  );
}

const JOB_RESPONSE = {
  id: 'job-1',
  provider: 'google',
  city: 'Karachi',
  category: 'restaurant',
  keyword: null,
  latitude: null,
  longitude: null,
  radiusMeters: 15000,
  status: 'queued',
  startedAt: null,
  finishedAt: null,
  duration: null,
  successRate: null,
  apiCallsUsed: 0,
  estimatedCost: 0,
  businessesFound: 0,
  businessesCreated: 0,
  businessesUpdated: 0,
  businessesFailed: 0,
  errorMessage: null,
};

// Integration test: the real RHF + Zod wiring against
// `createPlaceSyncJobSchema`'s per-field constraints, plus the mutation
// hook, composed together. The backend's own cross-field rule (city OR
// lat/long required) is deliberately not duplicated client-side — an
// empty submission is caught by the real backend and its exact message
// is surfaced, matching this app's "show backend validation errors
// exactly" pattern.
describe('PlaceSyncSearchForm', () => {
  it('submits an empty search, lets the backend reject it, and shows the backend message verbatim', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either city or latitude+longitude must be provided',
          },
        },
        400,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Start Synchronization' }));

    expect(
      await screen.findByText('Either city or latitude+longitude must be provided'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/place-sync-jobs'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ radiusMeters: 15_000 }) }),
    );
  });

  it('submits city/category/radius on success, and navigates to the new job', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(JOB_RESPONSE, 201));
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('City'), 'Karachi');
    await userEvent.type(screen.getByLabelText('Category'), 'restaurant');
    await userEvent.click(screen.getByRole('button', { name: 'Start Synchronization' }));

    await screen.findByRole('button', { name: 'Start Synchronization' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/place-sync-jobs'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ city: 'Karachi', category: 'restaurant', radiusMeters: 15_000 }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/discovery/sync/job-1');
  });

  it('rejects a radius above 50,000 meters (createPlaceSyncJobSchema max)', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('City'), 'Karachi');
    const radiusInput = screen.getByLabelText('Radius (meters)');
    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, '75000');
    await userEvent.click(screen.getByRole('button', { name: 'Start Synchronization' }));

    expect(await screen.findByText(/radius/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
