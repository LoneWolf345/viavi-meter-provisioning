import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProvisioningPage } from './ProvisioningPage';

vi.mock('@/services/provisioningApi', () => ({
  provisioningApi: {
    searchByMac: vi.fn(async () => []),
    addHsd: vi.fn(async () => ({ success: true }))
  }
}));

const fetchMock = vi.fn((input: RequestInfo) => {
  if (typeof input === 'string' && input.endsWith('approved-ouis.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ approved_ouis: ['A1B2C3'] }) });
  }
  if (typeof input === 'string' && input.endsWith('provision-defaults.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ account: 'acct', isp: 'isp', configfiles: ['cfg0','cfg1','cfg2','cfg3'] }) });
  }
  return Promise.reject(new Error('Unknown fetch'));
});

describe('ProvisioningPage sequential provisioning', () => {
  it('provisions MACs sequentially after validation', async () => {
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    const { provisioningApi } = await import('@/services/provisioningApi');

    render(<ProvisioningPage />);

    const input = await screen.findByPlaceholderText('AA:BB:CC:DD:EE:FF');
    await user.type(input, 'A1B2C3000000');
    await user.click(screen.getByText('Validate'));

    await waitFor(() => expect(provisioningApi.searchByMac).toHaveBeenCalled());
    await user.click(screen.getByText('Provision MACs'));

    await waitFor(() => expect(provisioningApi.addHsd).toHaveBeenCalledTimes(4));
    const calls = (provisioningApi.addHsd as any).mock.calls;
    expect(calls[0][0].mac).toBe('A1:B2:C3:00:00:00');
    expect(calls[1][0].mac).toBe('A1:B2:C3:00:00:01');
    expect(calls[2][0].mac).toBe('A1:B2:C3:00:00:02');
    expect(calls[3][0].mac).toBe('A1:B2:C3:00:00:03');
  });
});
