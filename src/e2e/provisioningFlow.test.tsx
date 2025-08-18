import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvisioningPage } from '@/components/ProvisioningPage';

vi.mock('@/services/provisioningApi', () => ({
  provisioningApi: {
    searchByMac: vi.fn(),
    addHsd: vi.fn()
  }
}));

import { provisioningApi } from '@/services/provisioningApi';

const setupFetch = (options: { approved: boolean }) => {
  return vi.fn<typeof fetch>(async (input: RequestInfo) => {
    if (typeof input === 'string' && input.endsWith('approved-ouis.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ approved_ouis: options.approved ? ['A1B2C3'] : [] }) } as Response);
    }
    if (typeof input === 'string' && input.endsWith('provision-defaults.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ account: 'acct', isp: 'isp', configfiles: ['cfg0','cfg1','cfg2','cfg3'] }) } as Response);
    }
    return Promise.reject(new Error('Unknown fetch'));
  });
};

const typeAndValidate = async (user: ReturnType<typeof userEvent.setup>) => {
  const input = await screen.findByPlaceholderText('AA:BB:CC:DD:EE:FF');
  await user.type(input, 'A1B2C3000000');
  await user.click(screen.getByText('Validate'));
};

describe('E2E provisioning flows', () => {
  beforeEach(() => {
    vi.mocked(provisioningApi.searchByMac).mockReset();
    vi.mocked(provisioningApi.addHsd).mockReset();
  });

  it('handles valid OUI with all MACs available', async () => {
    global.fetch = setupFetch({ approved: true }) as typeof fetch;
    const { provisioningApi } = await import('@/services/provisioningApi');
    vi.mocked(provisioningApi.searchByMac).mockResolvedValue([]);
    vi.mocked(provisioningApi.addHsd).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ProvisioningPage />);
    await typeAndValidate(user);

    await waitFor(() => expect(screen.getAllByText('Available').length).toBe(4));
  });

  it('marks existing MACs correctly', async () => {
    global.fetch = setupFetch({ approved: true }) as typeof fetch;
    const { provisioningApi } = await import('@/services/provisioningApi');
    vi.mocked(provisioningApi.searchByMac)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ account: 'existing', configfile: 'cfg1', isp: 'isp' }])
      .mockResolvedValue([]);
    vi.mocked(provisioningApi.addHsd).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ProvisioningPage />);
    await typeAndValidate(user);

    await waitFor(() => expect(screen.getByText('Exists')).toBeInTheDocument());
  });

  it('handles API failures during status check', async () => {
    global.fetch = setupFetch({ approved: true }) as typeof fetch;
    const { provisioningApi } = await import('@/services/provisioningApi');
    vi.mocked(provisioningApi.searchByMac)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValue([]);
    vi.mocked(provisioningApi.addHsd).mockResolvedValue({ success: true });

    const user = userEvent.setup();
    render(<ProvisioningPage />);
    await typeAndValidate(user);

    await waitFor(() => expect(screen.getByText('Unknown')).toBeInTheDocument());
  });
});
