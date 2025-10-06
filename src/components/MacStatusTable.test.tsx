import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MacStatusCard, MacStatus } from './MacStatusCard';

describe('MacStatusCard', () => {
  it('renders status badges correctly', () => {
    const mac: MacStatus = {
      mac: 'AA:AA:AA:AA:AA:00',
      configfile: 'cfg0',
      status: 'not-found',
      provisionState: 'pending'
    };

    render(<MacStatusCard mac={mac} />);
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('AA:AA:AA:AA:AA:00')).toBeInTheDocument();
  });

  it('renders provision state when enabled', () => {
    const mac: MacStatus = {
      mac: 'AA:AA:AA:AA:AA:00',
      configfile: 'cfg0',
      status: 'not-found',
      provisionState: 'complete'
    };

    render(<MacStatusCard mac={mac} showProvisionState />);
    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('shows error message when present', () => {
    const mac: MacStatus = {
      mac: 'AA:AA:AA:AA:AA:00',
      configfile: 'cfg0',
      status: 'not-found',
      provisionState: 'error',
      error: 'Test error message'
    };

    render(<MacStatusCard mac={mac} showProvisionState />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });
});
