import { beforeEach, describe, expect, it } from 'vitest';
import { provisioningApi, ProvisionRequest } from './provisioningApi';

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
    expect(validation.error).toBe('Validation Error');

    const server = await provisioningApi.addHsd({ ...baseReq, mac: '00:00:00:00:00:0B' });
    expect(server.success).toBe(false);
    expect(server.error).toBe('Server Error');
  });
});

