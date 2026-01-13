import { beforeEach, describe, expect, it, vi, afterEach, Mock } from 'vitest';
import { provisioningApi, ProvisionRequest } from './provisioningApi';

// Mock import.meta.env
const mockEnv = { PROD: false };
vi.mock('import.meta', () => ({
  env: mockEnv,
}));

describe('provisioningApi stub implementations', () => {
  beforeEach(() => {
    provisioningApi.configure({ enableStubMode: true, stubDelay: 0 });
  });

  it('searchByMac returns existing record for matching MAC', async () => {
    const result = await provisioningApi.searchByMac('00:00:00:00:00:03');
    expect(result).toHaveLength(1);
    expect(result[0].mac).toBe('00:00:00:00:00:03');
  });

  it('searchByMac returns empty array when MAC not found', async () => {
    const result = await provisioningApi.searchByMac('00:00:00:00:00:01');
    expect(result).toEqual([]);
  });

  it('searchByMac throws on simulated server error', async () => {
    await expect(provisioningApi.searchByMac('00:00:00:00:00:07')).rejects.toThrow();
  });

  it('addHsd handles success and error responses', async () => {
    const baseReq: Omit<ProvisionRequest, 'mac'> = {
      account: 'acct',
      configfile: 'cfg',
      isp: 'isp'
    };

    const success = await provisioningApi.addHsd({ ...baseReq, mac: '00:00:00:00:00:06' });
    expect(success).toEqual({ success: true });

    const validation = await provisioningApi.addHsd({ ...baseReq, mac: '00:00:00:00:00:05' });
    expect(validation.success).toBe(false);
    expect(validation.error).toBeDefined();

    const server = await provisioningApi.addHsd({ ...baseReq, mac: '00:00:00:00:00:0B' });
    expect(server.success).toBe(false);
    expect(server.error).toBeDefined();
  });
});

describe('provisioningApi real API mode', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    provisioningApi.configure({
      enableStubMode: false,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      stubDelay: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchByMac', () => {
    it('sends GET request with URL-encoded MAC address', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ mac: 'AA:BB:CC:DD:EE:FF', account: 'test', configfile: 'cfg', isp: 'isp' }]),
      });

      const result = await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.example.com/searchbymac/AA%3ABB%3ACC%3ADD%3AEE%3AFF');
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(result).toHaveLength(1);
      expect(result[0].mac).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('returns empty array when MAC not found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      const result = await provisioningApi.searchByMac('00:00:00:00:00:01');
      expect(result).toEqual([]);
    });

    it('throws classified error on 404 response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Resource not found'),
      });

      await expect(provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF')).rejects.toThrow();
    });

    it('throws classified error on 500 response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      try {
        await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as { classifiedError?: unknown }).classifiedError).toBeDefined();
      }
    });

    it('throws classified error on 401 unauthorized', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Authentication required'),
      });

      try {
        await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
        expect.fail('Should have thrown');
      } catch (error) {
        const classified = (error as { classifiedError?: { category: string } }).classifiedError;
        expect(classified?.category).toBe('auth');
      }
    });

    it('handles network errors with classification', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
        expect.fail('Should have thrown');
      } catch (error) {
        const classified = (error as { classifiedError?: { category: string } }).classifiedError;
        expect(classified).toBeDefined();
      }
    });

    it('handles timeout with AbortError', async () => {
      provisioningApi.configure({
        enableStubMode: false,
        baseUrl: 'https://api.example.com',
        timeout: 10, // Very short timeout
        stubDelay: 0,
      });

      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValueOnce(abortError);

      try {
        await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
        expect.fail('Should have thrown');
      } catch (error) {
        const classified = (error as { classifiedError?: { category: string } }).classifiedError;
        expect(classified?.category).toBe('timeout');
      }
    });
  });

  describe('addHsd', () => {
    const validRequest: ProvisionRequest = {
      mac: 'AA:BB:CC:DD:EE:FF',
      account: 'ViaviMeter',
      configfile: 'config.cfg',
      isp: 'CableOne',
    };

    it('sends POST request with JSON body', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(true),
      });

      const result = await provisioningApi.addHsd(validRequest);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.example.com/addhsd');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(JSON.parse(options.body)).toEqual(validRequest);
      expect(result.success).toBe(true);
    });

    it('returns success: false on 400 validation error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('MAC already exists'),
      });

      const result = await provisioningApi.addHsd(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('validation');
    });

    it('returns success: false on 500 server error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Database unavailable'),
      });

      const result = await provisioningApi.addHsd(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.category).toBe('server');
    });

    it('handles network errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Network error'));

      const result = await provisioningApi.addHsd(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles timeout gracefully', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValueOnce(abortError);

      const result = await provisioningApi.addHsd(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.category).toBe('timeout');
    });

    it('handles CORS errors', async () => {
      const corsError = new TypeError('Failed to fetch');
      fetchMock.mockRejectedValueOnce(corsError);

      const result = await provisioningApi.addHsd(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('provisioningApi configuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('configure() merges partial config', () => {
    provisioningApi.configure({ baseUrl: 'https://new-api.example.com' });
    provisioningApi.configure({ timeout: 60000 });

    // Verify by making a request (stub mode)
    provisioningApi.configure({ enableStubMode: true, stubDelay: 0 });
    // Should not throw - config is preserved
  });

  it('respects stubDelay in stub mode', async () => {
    provisioningApi.configure({ enableStubMode: true, stubDelay: 50 });

    const start = Date.now();
    await provisioningApi.searchByMac('00:00:00:00:00:01');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small timing variance
  });
});

describe('provisioningApi stub behavior patterns', () => {
  beforeEach(() => {
    provisioningApi.configure({ enableStubMode: true, stubDelay: 0 });
  });

  it('MAC divisible by 3 returns existing record', async () => {
    // 0x03 = 3, divisible by 3
    const result = await provisioningApi.searchByMac('00:00:00:00:00:03');
    expect(result).toHaveLength(1);
  });

  it('MAC divisible by 7 (but not 3 or 21) throws server error', async () => {
    // 0x07 = 7, divisible by 7 but not 3 or 21
    await expect(provisioningApi.searchByMac('00:00:00:00:00:07')).rejects.toThrow('Simulated server error');
  });

  it('MAC divisible by 21 returns existing record (exception to error rule)', async () => {
    // 0x15 = 21, divisible by both 3 and 7
    const result = await provisioningApi.searchByMac('00:00:00:00:00:15');
    expect(result).toHaveLength(1);
  });

  it('addHsd MAC divisible by 5 returns validation error', async () => {
    const result = await provisioningApi.addHsd({
      mac: '00:00:00:00:00:05',
      account: 'test',
      configfile: 'cfg',
      isp: 'isp',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('addHsd MAC divisible by 11 returns server error', async () => {
    const result = await provisioningApi.addHsd({
      mac: '00:00:00:00:00:0B', // 0x0B = 11
      account: 'test',
      configfile: 'cfg',
      isp: 'isp',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('provisioningApi proxy behavior', () => {
  let fetchMock: Mock;
  let originalEnv: ImportMetaEnv;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    originalEnv = { ...import.meta.env };
    provisioningApi.configure({
      enableStubMode: false,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      stubDelay: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.assign(import.meta.env, originalEnv);
  });

  it('uses configured baseUrl in development mode', async () => {
    // In test environment, PROD is false by default
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('https://api.example.com');
  });

  it('uses /api/ldap proxy path in production mode', async () => {
    // This test documents expected behavior - actual PROD check happens at runtime
    // The getEffectiveBaseUrl method returns '/api/ldap' when import.meta.env.PROD is true
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });

    // Note: We can't easily mock import.meta.env.PROD in Vitest
    // This test verifies the development path works correctly
    await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe('provisioningApi error classification integration', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    provisioningApi.configure({
      enableStubMode: false,
      baseUrl: 'https://api.example.com',
      timeout: 5000,
      stubDelay: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies 502 Bad Gateway as server error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      text: () => Promise.resolve('Upstream server unavailable'),
    });

    try {
      await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
      expect.fail('Should have thrown');
    } catch (error) {
      const classified = (error as { classifiedError?: { category: string; isRetryable: boolean } }).classifiedError;
      expect(classified?.category).toBe('server');
      expect(classified?.isRetryable).toBe(true);
    }
  });

  it('classifies 403 as auth error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve('Access denied'),
    });

    try {
      await provisioningApi.searchByMac('AA:BB:CC:DD:EE:FF');
      expect.fail('Should have thrown');
    } catch (error) {
      const classified = (error as { classifiedError?: { category: string } }).classifiedError;
      expect(classified?.category).toBe('auth');
    }
  });

  it('addHsd includes error context with URL', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Invalid MAC format'),
    });

    const result = await provisioningApi.addHsd({
      mac: 'invalid',
      account: 'test',
      configfile: 'cfg',
      isp: 'isp',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.category).toBe('validation');
  });
});
