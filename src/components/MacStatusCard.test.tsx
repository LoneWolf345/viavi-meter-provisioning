import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MacStatusCard, MacStatus } from './MacStatusCard';

const createMockMac = (overrides: Partial<MacStatus> = {}): MacStatus => ({
  mac: 'AA:BB:CC:DD:EE:FF',
  configfile: 'r-2000-1000',
  status: 'pending',
  provisionState: 'pending',
  ...overrides,
});

describe('MacStatusCard', () => {
  describe('status badges', () => {
    it('shows "Checking..." badge when status is checking', () => {
      const mac = createMockMac({ status: 'checking' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('shows "Exists" badge when status is found and not complete', () => {
      const mac = createMockMac({ status: 'found', provisionState: 'pending' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Exists')).toBeInTheDocument();
    });

    it('shows "Unknown" badge when status is unknown', () => {
      const mac = createMockMac({ status: 'unknown' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('shows "Pending" badge when status is pending', () => {
      const mac = createMockMac({ status: 'pending' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows "Available" badge when status is not-found', () => {
      const mac = createMockMac({ status: 'not-found' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('shows "Replaced" badge when provisioning complete with previous data', () => {
      const mac = createMockMac({
        status: 'found',
        provisionState: 'complete',
        currentData: { account: 'test', configfile: 'old-cfg', isp: 'isp' },
      });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Replaced')).toBeInTheDocument();
    });
  });

  describe('contextual labels', () => {
    it('shows "Previous Status" when provisioning is complete', () => {
      const mac = createMockMac({ provisionState: 'complete' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Previous Status')).toBeInTheDocument();
    });

    it('shows "Current Status" when provisioning is not complete', () => {
      const mac = createMockMac({ provisionState: 'pending' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Current Status')).toBeInTheDocument();
    });

    it('shows "Applied Config" label when provisioning is complete', () => {
      const mac = createMockMac({ provisionState: 'complete' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Applied Config')).toBeInTheDocument();
    });

    it('shows "Config to Apply" label when provisioning is not complete', () => {
      const mac = createMockMac({ provisionState: 'pending' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('Config to Apply')).toBeInTheDocument();
    });
  });

  describe('provision state badges', () => {
    it('shows "Provisioning..." badge during provisioning', () => {
      const mac = createMockMac({ provisionState: 'provisioning' });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Provisioning...')).toBeInTheDocument();
    });

    it('shows "Complete" badge on provision complete', () => {
      const mac = createMockMac({ provisionState: 'complete' });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('shows "Error" badge on provision error', () => {
      const mac = createMockMac({ provisionState: 'error', error: 'Failed to provision' });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('displays error message when present', () => {
      const mac = createMockMac({ provisionState: 'error', error: 'Network timeout' });
      render(<MacStatusCard mac={mac} showProvisionState />);
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  describe('layout and data display', () => {
    it('displays MAC address', () => {
      const mac = createMockMac({ mac: '11:22:33:44:55:66' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('11:22:33:44:55:66')).toBeInTheDocument();
    });

    it('displays configfile', () => {
      const mac = createMockMac({ configfile: 'test-config-file' });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText('test-config-file')).toBeInTheDocument();
    });

    it('displays current data account and configfile when present', () => {
      const mac = createMockMac({
        status: 'found',
        currentData: { account: 'TestAccount', configfile: 'old-config', isp: 'TestISP' },
      });
      render(<MacStatusCard mac={mac} />);
      expect(screen.getByText(/TestAccount/)).toBeInTheDocument();
      expect(screen.getByText(/old-config/)).toBeInTheDocument();
    });

    it('does not show provision state section when showProvisionState is false', () => {
      const mac = createMockMac({ provisionState: 'complete' });
      render(<MacStatusCard mac={mac} showProvisionState={false} />);
      expect(screen.queryByText('Provision State')).not.toBeInTheDocument();
    });
  });
});
