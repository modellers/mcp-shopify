import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShopifyClient } from './client.js';
import type { EnvConfig } from '../config/env.js';

// Mock node-fetch module
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('ShopifyClient', () => {
  let client: ShopifyClient;
  let config: EnvConfig;
  let mockFetch: any;

  beforeEach(async () => {
    config = {
      SHOPIFY_APP_CLIENT_ID: 'test_client_id',
      SHOPIFY_APP_SECRET: 'shpat_test123456789',
      SHOPIFY_APP_ENDPOINT: 'https://test-store.myshopify.com/admin/api/2025-10/graphql.json',
      STORE_COUNTRY: 'IS',
      STORE_CURRENCY: 'ISK',
      STORE_LOCALE: 'is-IS',
      HTTP_PORT: '3022',
      HTTP_SERVER: 'localhost',
    };
    client = new ShopifyClient(config);

    // Get the mocked fetch
    const { default: fetch } = await import('node-fetch');
    mockFetch = fetch as any;
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should send X-Shopify-Access-Token header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { test: 'data' } }),
      });

      await client.query('{ test }');

      expect(mockFetch).toHaveBeenCalledWith(
        config.SHOPIFY_APP_ENDPOINT,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Shopify-Access-Token': config.SHOPIFY_APP_SECRET,
          }),
        })
      );
    });

    it('should handle 401 authentication errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Authentication failed - Invalid or missing access token'
      );
    });

    it('should detect HTML login page responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => '<html><head><title>Login</title></head></html>',
      });

      await expect(client.query('{ test }')).rejects.toThrow();
    });
  });

  describe('HTTP error handling', () => {
    it('should handle 403 forbidden errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Forbidden - Valid authentication but insufficient permissions'
      );
    });

    it('should handle 404 not found errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Not Found - API endpoint does not exist'
      );
    });

    it('should handle 422 validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ error: 'Validation failed' }),
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Unprocessable Entity - Validation error in request'
      );
    });

    it('should handle 429 rate limit errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Too Many Requests - Rate limit exceeded'
      );
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'Server Error (500) - Shopify API is experiencing issues'
      );
    });
  });

  describe('GraphQL error handling', () => {
    it('should handle GraphQL validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              message: 'Field "invalid" doesn\'t exist on type "Product"',
              locations: [{ line: 2, column: 3 }],
              path: ['product', 'invalid'],
            },
          ],
        }),
      });

      await expect(client.query('{ test }')).rejects.toThrow('GraphQL Error');
    });

    it('should handle missing data in response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await expect(client.query('{ test }')).rejects.toThrow(
        'No data returned from GraphQL query'
      );
    });
  });

  describe('successful queries', () => {
    it('should return data on successful query', async () => {
      const mockData = { products: { edges: [] } };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: mockData }),
      });

      const result = await client.query('{ products { edges { node { id } } } }');

      expect(result).toEqual(mockData);
    });

    it('should send query and variables in request body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { test: 'data' } }),
      });

      const query = '{ product(id: $id) { id } }';
      const variables = { id: 'gid://shopify/Product/123' };

      await client.query(query, variables);

      expect(mockFetch).toHaveBeenCalledWith(
        config.SHOPIFY_APP_ENDPOINT,
        expect.objectContaining({
          body: JSON.stringify({ query, variables }),
        })
      );
    });
  });
});
