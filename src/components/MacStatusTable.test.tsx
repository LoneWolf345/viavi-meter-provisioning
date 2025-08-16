import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MacStatusTable, MacStatus } from './MacStatusTable';

const macs: MacStatus[] = [
  { mac: 'AA:AA:AA:AA:AA:00', index: 0, configfile: 'cfg0', status: 'pending', provisionState: 'pending' },
  { mac: 'AA:AA:AA:AA:AA:01', index: 1, configfile: 'cfg1', status: 'checking', provisionState: 'provisioning' },
  { mac: 'AA:AA:AA:AA:AA:02', index: 2, configfile: 'cfg2', status: 'found', provisionState: 'complete' },
  { mac: 'AA:AA:AA:AA:AA:03', index: 3, configfile: 'cfg3', status: 'not-found', provisionState: 'error' },
  { mac: 'AA:AA:AA:AA:AA:04', index: 4, configfile: 'cfg4', status: 'unknown', provisionState: 'pending' },
];

describe('MacStatusTable', () => {
  it('renders status and provision badges correctly', () => {
    render(<MacStatusTable macs={macs} showProvisionColumn />);

    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    expect(screen.getByText('Exists')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.getByText('Provisioning...')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });
});
