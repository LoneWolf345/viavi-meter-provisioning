import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MacValidator } from './MacValidator';

const createMockFetch = (approvedOuis: string[]) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ approved_ouis: approvedOuis }),
  });
};

describe('MacValidator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('input normalization', () => {
    it('normalizes input as user types', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'aabbcc');

      expect(input).toHaveValue('AA:BB:CC');
    });

    it('accepts compact format and normalizes to colon-separated', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'aabbccddeeff');

      expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
    });

    it('accepts hyphen-separated format', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AA-BB-CC-DD-EE-FF');

      expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
    });

    it('accepts Cisco dot format', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABB.CCDD.EEFF');

      expect(input).toHaveValue('AA:BB:CC:DD:EE:FF');
    });

    it('uppercases lowercase input', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'aa');

      expect(input).toHaveValue('AA');
    });
  });

  describe('validation flow', () => {
    it('shows error for incomplete MAC address', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCC');
      await user.click(screen.getByText('Validate'));

      expect(screen.getByText(/complete MAC address/)).toBeInTheDocument();
    });

    it('shows error for non-approved OUI', async () => {
      global.fetch = createMockFetch([]);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCCDDEEFF');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(screen.getByText(/not a known Viavi meter/)).toBeInTheDocument();
      });
    });

    it('calls onValidated with normalized MAC on success', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();
      const onValidated = vi.fn();

      render(<MacValidator onValidated={onValidated} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'aabbccddeeff');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(onValidated).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      });
    });

    it('shows success message after validation', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCCDDEEFF');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(screen.getByText(/validated successfully/)).toBeInTheDocument();
      });
    });
  });

  describe('helper text', () => {
    it('displays format helper text', () => {
      global.fetch = createMockFetch([]);

      render(<MacValidator onValidated={vi.fn()} />);

      expect(screen.getByText(/AA:BB:CC:DD:EE:FF/)).toBeInTheDocument();
      expect(screen.getByText(/AA-BB-CC-DD-EE-FF/)).toBeInTheDocument();
    });

    it('shows "Press Validate to continue" hint when MAC is complete', async () => {
      global.fetch = createMockFetch(['AABBCC']);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCCDDEEFF');

      expect(screen.getByText(/Press Validate to continue/)).toBeInTheDocument();
    });
  });

  describe('button state', () => {
    it('disables validate button when input is empty', () => {
      global.fetch = createMockFetch([]);

      render(<MacValidator onValidated={vi.fn()} />);

      const button = screen.getByText('Validate');
      expect(button).toBeDisabled();
    });

    it('disables validate button when isLoading is true', async () => {
      global.fetch = createMockFetch([]);
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} isLoading={true} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AA');

      const button = screen.getByText('Validate');
      expect(button).toBeDisabled();
    });
  });

  describe('OUI check', () => {
    it('fetches approved OUIs from config', async () => {
      const mockFetch = createMockFetch(['AABBCC']);
      global.fetch = mockFetch;
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCCDDEEFF');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/config/approved-ouis.json');
      });
    });

    it('handles OUI config fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();

      render(<MacValidator onValidated={vi.fn()} />);

      const input = screen.getByPlaceholderText(/Enter MAC/);
      await user.type(input, 'AABBCCDDEEFF');
      await user.click(screen.getByText('Validate'));

      await waitFor(() => {
        expect(screen.getByText(/not a known Viavi meter/)).toBeInTheDocument();
      });
    });
  });
});
