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

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const inputStr = typeof input === 'string' ? input : input.toString();
  if (inputStr.endsWith('approved-ouis.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ approved_ouis: ['A1B2C3'] }) } as Response);
  }
  if (inputStr.endsWith('provision-defaults.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ account: 'acct', isp: 'isp', configfile: 'cfg0' }) } as Response);
  }
  return Promise.reject(new Error('Unknown fetch'));
});

describe('ProvisioningPage single MAC provisioning', () => {
  it('provisions single MAC after validation', async () => {
    global.fetch = fetchMock as typeof fetch;
    const user = userEvent.setup();
    const { provisioningApi } = await import('@/services/provisioningApi');

    render(<ProvisioningPage />);

    const input = await screen.findByPlaceholderText('AA:BB:CC:DD:EE:FF');
    await user.type(input, 'A1B2C3000000');
    await user.click(screen.getByText('Validate'));

    await waitFor(() => expect(vi.mocked(provisioningApi.searchByMac)).toHaveBeenCalled());
    await user.click(screen.getByText('Provision MAC'));

    await waitFor(() => expect(vi.mocked(provisioningApi.addHsd)).toHaveBeenCalledTimes(1));
    const call = vi.mocked(provisioningApi.addHsd).mock.calls[0];
    expect(call[0].mac).toBe('A1:B2:C3:00:00:00');
  });
});
