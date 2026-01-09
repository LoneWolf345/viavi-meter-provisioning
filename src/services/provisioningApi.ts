/**
 * API service for MAC provisioning operations.
 *
 * The API is configured at application startup using values from Vite
 * environment variables. See `provisioningApi.configure` in `main.tsx` for
 * details.
 */

import { serverLogger } from '@/utils/serverLogger';

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
  error?: string;
  detail?: string;
}

export interface ApiConfig {
  baseUrl: string;
  enableStubMode: boolean;
  stubDelay: number;
}

class ProvisioningApiService {
  private config: ApiConfig = {
    baseUrl: '',
    enableStubMode: true, // Default to stub mode for development
    stubDelay: 1500
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
    serverLogger.info('[API] Fetching', { url, mac, encodedMac });

    try {
      const response = await fetch(url);
      serverLogger.info('[API] Response received', { 
        status: response.status, 
        ok: response.ok,
        statusText: response.statusText
      });
      
      if (!response.ok) {
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      serverLogger.info('[API] Response data', { data });
      return data;
    } catch (error) {
      serverLogger.error('[API] Search error', {
        message: (error as Error).message,
        name: (error as Error).name,
        url
      });
      throw error;
    }
  }

  /**
   * Provision a MAC address
   */
  async addHsd(request: ProvisionRequest): Promise<ProvisionResponse> {
    if (this.config.enableStubMode) {
      return this.stubAddHsd(request);
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/addhsd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: result === true };
      }

      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: 'Validation Error',
          detail: errorData.detail || 'Bad request'
        };
      }

      if (response.status >= 500) {
        return {
          success: false,
          error: 'Server Error',
          detail: `HTTP ${response.status}: Server error`
        };
      }

      return {
        success: false,
        error: 'Unknown Error',
        detail: `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      serverLogger.error('[API] Provision error', { error: (error as Error).message });
      return {
        success: false,
        error: 'Network Error',
        detail: (error as Error).message
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

    if (shouldError && macNumber % 21 !== 0) { // But not if both conditions are true
      throw new Error('Simulated server error (5xx)');
    }

    if (shouldExist) {
      return [{
        mac,
        account: 'ViaviMeter',
        configfile: 'existing-config',
        isp: 'CableOne',
        customFields: null
      }];
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
        error: 'Server Error',
        detail: 'Simulated internal server error'
      };
    }

    if (shouldError400) {
      return {
        success: false,
        error: 'Validation Error',
        detail: 'MAC address already exists with different configuration'
      };
    }

    return { success: true };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const provisioningApi = new ProvisioningApiService();
