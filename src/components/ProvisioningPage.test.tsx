import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProvisioningPage } from './ProvisioningPage';

vi.mock('@/services/provisioningApi', () => ({
  provisioningApi: {
    searchByMac: vi.fn(async () => []),
    addHsd: vi.fn(async () => ({ success: true }))
  }
}));

const createFetchMock = (approvedOuis: string[] = ['A1B2C3']) => {
  return vi.fn(async (input: RequestInfo | URL) => {
    const inputStr = typeof input === 'string' ? input : input.toString();
    if (inputStr.endsWith('approved-ouis.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ approved_ouis: approvedOuis }) } as Response);
    }
    if (inputStr.endsWith('provision-defaults.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ account: 'acct', isp: 'isp', configfile: 'cfg0' }) } as Response);
    }
    return Promise.reject(new Error('Unknown fetch'));
  });
};

describe('ProvisioningPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('single MAC provisioning', () => {
    it('provisions single MAC after validation', async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();
      const { provisioningApi } = await import('@/services/provisioningApi');

      render(<ProvisioningPage />);

      const input = await screen.findByPlaceholderText(/Enter MAC/);
      await user.type(input, 'A1B2C3000000');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => expect(vi.mocked(provisioningApi.searchByMac)).toHaveBeenCalled());
      await user.click(screen.getByText('Provision MAC'));

      await waitFor(() => expect(vi.mocked(provisioningApi.addHsd)).toHaveBeenCalledTimes(1));
      const call = vi.mocked(provisioningApi.addHsd).mock.calls[0];
      expect(call[0].mac).toBe('A1:B2:C3:00:00:00');
    });
  });

  describe('step indicator', () => {
    it('shows step 1 as active initially', async () => {
      global.fetch = createFetchMock();
      render(<ProvisioningPage />);

      // Step 1 should show "1" (active), not a checkmark
      const stepIndicators = screen.getAllByText('1');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('shows step 1 complete after MAC validated', async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();
      const { provisioningApi } = await import('@/services/provisioningApi');
      vi.mocked(provisioningApi.searchByMac).mockResolvedValue([]);

      render(<ProvisioningPage />);

      const input = await screen.findByPlaceholderText(/Enter MAC/);
      await user.type(input, 'A1B2C3000000');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        // After validation, step 1 should be complete (checkmark visible)
        expect(screen.queryByText('1')).not.toBeInTheDocument();
      });
    });

    it('shows all steps complete on successful provisioning', async () => {
      global.fetch = createFetchMock();
      const user = userEvent.setup();
      const { provisioningApi } = await import('@/services/provisioningApi');
      vi.mocked(provisioningApi.searchByMac).mockResolvedValue([]);
      vi.mocked(provisioningApi.addHsd).mockResolvedValue({ success: true });

      render(<ProvisioningPage />);

      const input = await screen.findByPlaceholderText(/Enter MAC/);
      await user.type(input, 'A1B2C3000000');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => expect(vi.mocked(provisioningApi.searchByMac)).toHaveBeenCalled());
      await user.click(screen.getByText('Provision MAC'));

      await waitFor(() => {
        // All three step numbers should be replaced with checkmarks
        expect(screen.queryByText('1')).not.toBeInTheDocument();
        expect(screen.queryByText('2')).not.toBeInTheDocument();
        expect(screen.queryByText('3')).not.toBeInTheDocument();
      });
    });
  });
});
