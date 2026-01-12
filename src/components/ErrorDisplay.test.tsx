import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorDisplay } from './ErrorDisplay';
import { ClassifiedError } from '@/utils/errorUtils';

const createMockError = (overrides: Partial<ClassifiedError> = {}): ClassifiedError => ({
  category: 'network',
  title: 'Network Error',
  message: 'Unable to connect to the server.',
  likelyCause: 'The server may be down.',
  suggestion: 'Check your network connection.',
  technicalDetail: 'Failed to fetch: net::ERR_CONNECTION_REFUSED',
  isRetryable: true,
  ...overrides,
});

describe('ErrorDisplay', () => {
  it('renders error title and message', () => {
    const error = createMockError();
    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to connect to the server.')).toBeInTheDocument();
  });

  it('renders likely cause and suggestion', () => {
    const error = createMockError();
    render(<ErrorDisplay error={error} />);

    expect(screen.getByText(/The server may be down/)).toBeInTheDocument();
    expect(screen.getByText(/Check your network connection/)).toBeInTheDocument();
  });

  it('shows retry button when error is retryable and onRetry is provided', () => {
    const error = createMockError({ isRetryable: true });
    const onRetry = vi.fn();
    render(<ErrorDisplay error={error} onRetry={onRetry} />);

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('hides retry button when error is not retryable', () => {
    const error = createMockError({ isRetryable: false });
    const onRetry = vi.fn();
    render(<ErrorDisplay error={error} onRetry={onRetry} />);

    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const error = createMockError({ isRetryable: true });
    const onRetry = vi.fn();
    render(<ErrorDisplay error={error} onRetry={onRetry} />);

    await user.click(screen.getByText('Try Again'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const error = createMockError();
    const onDismiss = vi.fn();
    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    const error = createMockError();
    const onDismiss = vi.fn();
    render(<ErrorDisplay error={error} onDismiss={onDismiss} />);

    await user.click(screen.getByText('Dismiss'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows technical details toggle when technicalDetail is provided', () => {
    const error = createMockError({ technicalDetail: 'Some technical detail' });
    render(<ErrorDisplay error={error} />);

    expect(screen.getByText('Technical details')).toBeInTheDocument();
  });

  it('expands technical details when clicked', async () => {
    const user = userEvent.setup();
    const error = createMockError({ technicalDetail: 'Some technical detail' });
    render(<ErrorDisplay error={error} />);

    await user.click(screen.getByText('Technical details'));

    expect(screen.getByText('Some technical detail')).toBeInTheDocument();
  });

  it('hides technical details toggle when showTechnicalDetails is false', () => {
    const error = createMockError({ technicalDetail: 'Some technical detail' });
    render(<ErrorDisplay error={error} showTechnicalDetails={false} />);

    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
  });

  describe('compact mode', () => {
    it('renders simplified view in compact mode', () => {
      const error = createMockError();
      render(<ErrorDisplay error={error} compact />);

      expect(screen.getByText('Unable to connect to the server.')).toBeInTheDocument();
      expect(screen.queryByText('Network Error')).not.toBeInTheDocument();
      expect(screen.queryByText(/Likely cause/)).not.toBeInTheDocument();
    });

    it('shows retry in compact mode when retryable', () => {
      const error = createMockError({ isRetryable: true });
      const onRetry = vi.fn();
      render(<ErrorDisplay error={error} onRetry={onRetry} compact />);

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('category icons', () => {
    const categories: ClassifiedError['category'][] = [
      'network',
      'cors',
      'server',
      'validation',
      'timeout',
      'config',
      'oui',
      'auth',
      'unknown',
    ];

    categories.forEach((category) => {
      it(`renders without error for category: ${category}`, () => {
        const error = createMockError({ category });
        expect(() => render(<ErrorDisplay error={error} />)).not.toThrow();
      });
    });
  });
});
