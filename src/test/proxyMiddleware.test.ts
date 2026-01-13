/**
 * Integration tests for the Vite proxy middleware
 * Tests CORS bypass behavior in preview mode
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';

// Mock fetch for proxy tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock IncomingMessage
function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: string;
}): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = options.method || 'GET';
  req.url = options.url || '/searchbymac/001122334455';
  
  // Simulate body chunks for POST requests
  if (options.body) {
    setTimeout(() => {
      req.emit('data', Buffer.from(options.body));
      req.emit('end');
    }, 0);
  } else {
    setTimeout(() => req.emit('end'), 0);
  }
  
  return req;
}

// Helper to create mock ServerResponse
function createMockResponse(): ServerResponse & { 
  _statusCode: number; 
  _headers: Record<string, string>; 
  _body: string;
} {
  const res = {
    _statusCode: 200,
    _headers: {} as Record<string, string>,
    _body: '',
    writeHead(statusCode: number, headers?: Record<string, string>) {
      this._statusCode = statusCode;
      if (headers) {
        this._headers = { ...this._headers, ...headers };
      }
      return this;
    },
    end(body?: string) {
      if (body) this._body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this._headers[name] = value;
      return this;
    },
  } as unknown as ServerResponse & { 
    _statusCode: number; 
    _headers: Record<string, string>; 
    _body: string;
  };
  
  return res;
}

// Simplified proxy handler extracted from vite.config.ts logic
async function proxyHandler(
  req: IncomingMessage,
  res: ServerResponse,
  ldapApiUrl: string
): Promise<void> {
  const targetUrl = `${ldapApiUrl}${req.url || ''}`;

  try {
    // Collect request body for POST requests
    let requestBody: string | undefined;
    if (req.method === 'POST' || req.method === 'PUT') {
      requestBody = await new Promise<string>((resolve) => {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => resolve(body));
      });
    }

    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: requestBody,
    });

    const data = await response.text();

    // Forward response headers and body with CORS header
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown proxy error';
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Proxy error', 
      message: errMsg,
      target: targetUrl 
    }));
  }
}

describe('Vite Proxy Middleware', () => {
  const LDAP_API_URL = 'http://ldapapi.ldap-api.svc.cluster.local:8080';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('CORS Bypass', () => {
    it('should add Access-Control-Allow-Origin header to responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"result": "success"}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/001122334455' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should forward requests to the configured backend URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/AABBCCDDEEFF' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${LDAP_API_URL}/searchbymac/AABBCCDDEEFF`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
      );
    });
  });

  describe('GET Requests', () => {
    it('should proxy searchbymac requests successfully', async () => {
      const mockData = {
        macaddress: 'AA:BB:CC:DD:EE:FF',
        serialnumber: 'VIAVI123456',
        status: 'active',
      };
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockData)),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/AABBCCDDEEFF' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(200);
      expect(JSON.parse(res._body)).toEqual(mockData);
    });

    it('should handle 404 responses from backend', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: () => Promise.resolve('{"error": "MAC address not found"}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/000000000000' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(404);
    });
  });

  describe('POST Requests', () => {
    it('should forward POST body to backend', async () => {
      const requestBody = JSON.stringify({
        macaddress: 'AA:BB:CC:DD:EE:FF',
        serialnumber: 'VIAVI123456',
      });
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"success": true}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ 
        method: 'POST', 
        url: '/addhsd',
        body: requestBody,
      });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${LDAP_API_URL}/addhsd`,
        expect.objectContaining({
          method: 'POST',
          body: requestBody,
        })
      );
      expect(res._statusCode).toBe(200);
    });

    it('should handle PUT requests with body', async () => {
      const requestBody = JSON.stringify({ update: 'data' });
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"updated": true}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ 
        method: 'PUT', 
        url: '/update',
        body: requestBody,
      });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${LDAP_API_URL}/update`,
        expect.objectContaining({
          method: 'PUT',
          body: requestBody,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 502 on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(502);
      const body = JSON.parse(res._body);
      expect(body.error).toBe('Proxy error');
      expect(body.message).toBe('ECONNREFUSED');
      expect(body.target).toBe(`${LDAP_API_URL}/searchbymac/test`);
    });

    it('should return 502 on DNS resolution failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(502);
      expect(JSON.parse(res._body).message).toBe('getaddrinfo ENOTFOUND');
    });

    it('should return 502 on timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(502);
      expect(JSON.parse(res._body).message).toBe('Request timeout');
    });

    it('should handle unknown errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Some non-Error object');

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(502);
      expect(JSON.parse(res._body).message).toBe('Unknown proxy error');
    });
  });

  describe('Backend Error Forwarding', () => {
    it('should forward 400 Bad Request from backend', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"error": "Invalid MAC format"}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/invalid' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(400);
      expect(res._headers['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should forward 500 Internal Server Error from backend', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: () => Promise.resolve('{"error": "Internal server error"}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(500);
    });

    it('should forward 503 Service Unavailable from backend', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        text: () => Promise.resolve('{"error": "Service unavailable"}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/healthz' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._statusCode).toBe(503);
    });
  });

  describe('Content-Type Handling', () => {
    it('should preserve Content-Type from backend response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html>test</html>'),
        headers: new Map([['Content-Type', 'text/html']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/docs' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._headers['Content-Type']).toBe('text/html');
    });

    it('should default to application/json when Content-Type is missing', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map<string, string>(),
      };
      mockResponse.headers.get = () => null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(res._headers['Content-Type']).toBe('application/json');
    });
  });

  describe('URL Path Handling', () => {
    it('should handle paths with query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ 
        method: 'GET', 
        url: '/searchbymac/test?format=json&include=metadata',
      });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${LDAP_API_URL}/searchbymac/test?format=json&include=metadata`,
        expect.any(Object)
      );
    });

    it('should handle empty URL path', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '' });
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        LDAP_API_URL,
        expect.any(Object)
      );
    });

    it('should handle undefined URL', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET' });
      req.url = undefined;
      const res = createMockResponse();

      await proxyHandler(req, res, LDAP_API_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        LDAP_API_URL,
        expect.any(Object)
      );
    });
  });

  describe('Environment Configuration', () => {
    it('should use internal cluster URL in production', async () => {
      const internalUrl = 'http://ldapapi.ldap-api.svc.cluster.local:8080';
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, internalUrl);

      expect(mockFetch).toHaveBeenCalledWith(
        `${internalUrl}/searchbymac/test`,
        expect.any(Object)
      );
    });

    it('should use external URL when configured', async () => {
      const externalUrl = 'https://ldap-api.apps.prod-ocp4.corp.cableone.net';
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
        headers: new Map([['Content-Type', 'application/json']]),
      };
      mockResponse.headers.get = (key: string) => mockResponse.headers.get(key) || null;
      mockFetch.mockResolvedValueOnce(mockResponse);

      const req = createMockRequest({ method: 'GET', url: '/searchbymac/test' });
      const res = createMockResponse();

      await proxyHandler(req, res, externalUrl);

      expect(mockFetch).toHaveBeenCalledWith(
        `${externalUrl}/searchbymac/test`,
        expect.any(Object)
      );
    });
  });
});
