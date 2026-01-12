/**
 * Centralized error classification and user-friendly messaging.
 * Categorizes errors and provides actionable explanations.
 */

export type ErrorCategory =
  | 'network'
  | 'cors'
  | 'server'
  | 'validation'
  | 'timeout'
  | 'config'
  | 'oui'
  | 'auth'
  | 'unknown';

export interface ClassifiedError {
  category: ErrorCategory;
  title: string;
  message: string;
  likelyCause: string;
  suggestion: string;
  technicalDetail?: string;
  isRetryable: boolean;
}

/**
 * Known error patterns and their classifications
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | ((error: Error, context?: ErrorContext) => boolean);
  classify: (error: Error, context?: ErrorContext) => Partial<ClassifiedError>;
}> = [
  // CORS errors
  {
    pattern: /cors|cross-origin|blocked by cors|access-control-allow-origin/i,
    classify: () => ({
      category: 'cors',
      title: 'Connection Blocked',
      message: 'The browser blocked this request due to security restrictions.',
      likelyCause: 'The backend API server is not configured to accept requests from this application.',
      suggestion: 'Contact the API administrator to enable CORS headers, or use the application proxy.',
      isRetryable: false,
    }),
  },
  // Network/fetch failures
  {
    pattern: /failed to fetch|network error|networkerror|net::/i,
    classify: () => ({
      category: 'network',
      title: 'Network Error',
      message: 'Unable to connect to the server.',
      likelyCause: 'The server may be down, or there could be a network connectivity issue.',
      suggestion: 'Check your network connection and verify the server is running.',
      isRetryable: true,
    }),
  },
  // Timeout
  {
    pattern: /timeout|timed out|aborted/i,
    classify: () => ({
      category: 'timeout',
      title: 'Request Timeout',
      message: 'The server took too long to respond.',
      likelyCause: 'The server may be overloaded or the network is slow.',
      suggestion: 'Wait a moment and try again. If the problem persists, contact support.',
      isRetryable: true,
    }),
  },
  // Server errors (5xx)
  {
    pattern: /server error|5\d{2}|internal server|502|503|504/i,
    classify: (error) => ({
      category: 'server',
      title: 'Server Error',
      message: 'The server encountered an error processing your request.',
      likelyCause: 'There may be an issue with the backend service or database.',
      suggestion: 'This is a temporary issue. Wait a few minutes and try again.',
      technicalDetail: error.message,
      isRetryable: true,
    }),
  },
  // Validation errors (400)
  {
    pattern: /validation|400|bad request|invalid/i,
    classify: (error) => ({
      category: 'validation',
      title: 'Validation Error',
      message: 'The request contains invalid data.',
      likelyCause: 'The MAC address format or configuration values may be incorrect.',
      suggestion: 'Verify all input values are correct and try again.',
      technicalDetail: error.message,
      isRetryable: false,
    }),
  },
  // Auth errors
  {
    pattern: /401|403|unauthorized|forbidden|authentication/i,
    classify: () => ({
      category: 'auth',
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.',
      likelyCause: 'Your session may have expired or you lack the required permissions.',
      suggestion: 'Try refreshing the page. If the issue persists, contact your administrator.',
      isRetryable: false,
    }),
  },
  // Config load errors
  {
    pattern: /config|provision-defaults|approved-ouis/i,
    classify: () => ({
      category: 'config',
      title: 'Configuration Error',
      message: 'Failed to load application configuration.',
      likelyCause: 'Configuration files may be missing or inaccessible.',
      suggestion: 'Refresh the page. If the problem persists, contact support.',
      isRetryable: true,
    }),
  },
  // OUI validation
  {
    pattern: (_, context) => context?.type === 'oui',
    classify: () => ({
      category: 'oui',
      title: 'OUI Not Recognized',
      message: 'The MAC address vendor (OUI) is not in the approved list.',
      likelyCause: 'This device manufacturer is not configured for provisioning.',
      suggestion: 'Verify the MAC address is correct. If it is, contact your administrator to add this OUI.',
      isRetryable: false,
    }),
  },
];

export interface ErrorContext {
  type?: 'search' | 'provision' | 'config' | 'oui';
  url?: string;
  statusCode?: number;
}

/**
 * Classify an error and return user-friendly information
 */
export function classifyError(
  error: Error | string,
  context?: ErrorContext
): ClassifiedError {
  const err = typeof error === 'string' ? new Error(error) : error;
  const errorMessage = err.message.toLowerCase();

  // Check HTTP status code from context first
  if (context?.statusCode) {
    if (context.statusCode >= 500) {
      return {
        category: 'server',
        title: 'Server Error',
        message: `The server returned an error (${context.statusCode}).`,
        likelyCause: 'The backend service encountered an internal error.',
        suggestion: 'Wait a moment and try again. If the problem persists, contact support.',
        technicalDetail: err.message,
        isRetryable: true,
      };
    }
    if (context.statusCode === 400) {
      return {
        category: 'validation',
        title: 'Invalid Request',
        message: 'The server rejected the request as invalid.',
        likelyCause: 'The data sent may be in the wrong format or contain invalid values.',
        suggestion: 'Check your input and try again.',
        technicalDetail: err.message,
        isRetryable: false,
      };
    }
    if (context.statusCode === 401 || context.statusCode === 403) {
      return {
        category: 'auth',
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        likelyCause: 'Your session may have expired or you lack the required permissions.',
        suggestion: 'Refresh the page and try again.',
        isRetryable: false,
      };
    }
  }

  // Match against known patterns
  for (const { pattern, classify } of ERROR_PATTERNS) {
    const matches =
      typeof pattern === 'function'
        ? pattern(err, context)
        : pattern.test(errorMessage) || pattern.test(err.name);

    if (matches) {
      const classified = classify(err, context);
      return {
        category: classified.category || 'unknown',
        title: classified.title || 'Error',
        message: classified.message || err.message,
        likelyCause: classified.likelyCause || 'Unknown cause.',
        suggestion: classified.suggestion || 'Please try again.',
        technicalDetail: classified.technicalDetail || err.message,
        isRetryable: classified.isRetryable ?? false,
      };
    }
  }

  // Default unknown error
  return {
    category: 'unknown',
    title: 'Unexpected Error',
    message: 'An unexpected error occurred.',
    likelyCause: 'This could be a temporary issue or a bug in the application.',
    suggestion: 'Try refreshing the page. If the problem persists, contact support.',
    technicalDetail: err.message,
    isRetryable: true,
  };
}

/**
 * Create an Error from an HTTP response
 */
export async function createErrorFromResponse(
  response: Response,
  context?: Omit<ErrorContext, 'statusCode'>
): Promise<ClassifiedError> {
  let message = `HTTP ${response.status}: ${response.statusText}`;

  try {
    const body = await response.text();
    if (body) {
      const json = JSON.parse(body);
      message = json.detail || json.error || json.message || message;
    }
  } catch {
    // Ignore JSON parse errors
  }

  return classifyError(new Error(message), {
    ...context,
    statusCode: response.status,
  });
}

/**
 * Type guard to check if an error is a classified error
 */
export function isClassifiedError(error: unknown): error is ClassifiedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'category' in error &&
    'title' in error &&
    'message' in error
  );
}
