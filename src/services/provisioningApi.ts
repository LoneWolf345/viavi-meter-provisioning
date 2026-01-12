/**
 * API service for MAC provisioning operations.
 *
 * The API is configured at application startup using values from Vite
 * environment variables. See `provisioningApi.configure` in `main.tsx` for
 * details.
 */

import { serverLogger } from '@/utils/serverLogger';
import { classifyError, ClassifiedError, createErrorFromResponse, ErrorContext } from '@/utils/errorUtils';

export interface MacSearchResult {
  mac: string;
  account: string;
  configfile: string;
  isp: string;
  customFields?: Record<string, unknown>;
}

export interface ProvisionRequest {
  mac: string;
  account: string;
  configfile: string;
  isp: string;
}

export interface ProvisionResponse {
  success: boolean;
  error?: ClassifiedError;
  /** @deprecated Use error.technicalDetail instead */
  detail?: string;
}

export interface ApiConfig {
  baseUrl: string;
  enableStubMode: boolean;
  stubDelay: number;
  timeout: number;
}

class ProvisioningApiService {
  private config: ApiConfig = {
    baseUrl: '',
    enableStubMode: true, // Default to stub mode for development
    stubDelay: 1500,
    timeout: 30000, // 30 second timeout
  };

  configure(config: Partial<ApiConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Search for MAC address status
   */
  async searchByMac(mac: string): Promise<MacSearchResult[]> {
    if (this.config.enableStubMode) {
      serverLogger.info('[API] Stub mode enabled, using mock data');
      return this.stubSearchByMac(mac);
    }

    // URL-encode the MAC address to handle colons properly
    const encodedMac = encodeURIComponent(mac);
    const url = `${this.config.baseUrl}/searchbymac/${encodedMac}`;
    const context: ErrorContext = { type: 'search', url };

    serverLogger.info('[API] Fetching', { url, mac, encodedMac });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      serverLogger.info('[API] Response received', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const classifiedError = await createErrorFromResponse(response, context);
        serverLogger.error('[API] Search error response', {
          status: response.status,
          classifiedError,
        });
        throw Object.assign(new Error(classifiedError.message), { classifiedError });
      }

      const data = await response.json();
      serverLogger.info('[API] Response data', { data });
      return data;
    } catch (error) {
      // Handle abort as timeout
      if ((error as Error).name === 'AbortError') {
        const timeoutError = classifyError(new Error('Request timed out'), context);
        serverLogger.error('[API] Search timeout', { url, timeout: this.config.timeout });
        throw Object.assign(new Error(timeoutError.message), { classifiedError: timeoutError });
      }

      // If already classified, re-throw
      if ((error as { classifiedError?: ClassifiedError }).classifiedError) {
        throw error;
      }

      // Classify unknown errors
      const classifiedError = classifyError(error as Error, context);
      serverLogger.error('[API] Search error', {
        message: (error as Error).message,
        name: (error as Error).name,
        url,
        classifiedError,
      });
      throw Object.assign(new Error(classifiedError.message), { classifiedError });
    }
  }

  /**
   * Provision a MAC address
   */
  async addHsd(request: ProvisionRequest): Promise<ProvisionResponse> {
    if (this.config.enableStubMode) {
      return this.stubAddHsd(request);
    }

    const url = `${this.config.baseUrl}/addhsd`;
    const context: ErrorContext = { type: 'provision', url };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        return { success: result === true };
      }

      const classifiedError = await createErrorFromResponse(response, context);
      return {
        success: false,
        error: classifiedError,
        detail: classifiedError.technicalDetail,
      };
    } catch (error) {
      // Handle abort as timeout
      if ((error as Error).name === 'AbortError') {
        const timeoutError = classifyError(new Error('Request timed out'), context);
        return {
          success: false,
          error: timeoutError,
          detail: timeoutError.technicalDetail,
        };
      }

      const classifiedError = classifyError(error as Error, context);
      serverLogger.error('[API] Provision error', {
        error: (error as Error).message,
        classifiedError,
      });
      return {
        success: false,
        error: classifiedError,
        detail: classifiedError.technicalDetail,
      };
    }
  }

  /**
   * Stub implementation for development/testing
   */
  private async stubSearchByMac(mac: string): Promise<MacSearchResult[]> {
    await this.delay(this.config.stubDelay);

    // Simulate different responses based on MAC
    const macNumber = parseInt(mac.replace(/:/g, ''), 16);
    const shouldExist = macNumber % 3 === 0; // Every 3rd MAC "exists"
    const shouldError = macNumber % 7 === 0; // Every 7th MAC causes server error

    if (shouldError && macNumber % 21 !== 0) {
      // But not if both conditions are true
      throw new Error('Simulated server error (5xx)');
    }

    if (shouldExist) {
      return [
        {
          mac,
          account: 'ViaviMeter',
          configfile: 'existing-config',
          isp: 'CableOne',
          customFields: null,
        },
      ];
    }

    return []; // Not found
  }

  /**
   * Stub implementation for provisioning
   */
  private async stubAddHsd(request: ProvisionRequest): Promise<ProvisionResponse> {
    await this.delay(this.config.stubDelay);

    // Simulate different responses based on MAC
    const macNumber = parseInt(request.mac.replace(/:/g, ''), 16);
    const shouldError400 = macNumber % 5 === 0; // Every 5th MAC gets 400 error
    const shouldError500 = macNumber % 11 === 0; // Every 11th MAC gets 500 error

    if (shouldError500) {
      return {
        success: false,
        error: classifyError(new Error('Server error: 500'), { type: 'provision' }),
        detail: 'Simulated internal server error',
      };
    }

    if (shouldError400) {
      return {
        success: false,
        error: classifyError(new Error('Validation failed: MAC already exists'), {
          type: 'provision',
        }),
        detail: 'MAC address already exists with different configuration',
      };
    }

    return { success: true };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const provisioningApi = new ProvisioningApiService();
