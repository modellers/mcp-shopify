import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getItem, listItems, totalItems, getOrder, listSales, totalSales } from './tools.js';
import { ShopifyClient } from '../shopify/client.js';
import type { EnvConfig } from '../config/env.js';

// Mock the cache-wrapper to disable delays and caching in tests
vi.mock('../shopify/cache-wrapper.js', () => {
  return {
    CacheWrapper: class {
      async get(_key: string, fn: () => Promise<any>) {
        return await fn();
      }
    },
  };
});

describe('MCP Tools', () => {
  let mockClient: ShopifyClient;
  let config: EnvConfig;

  beforeEach(() => {
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
    mockClient = new ShopifyClient(config);
    vi.clearAllMocks();
  });

  describe('Inventory Tools', () => {
    describe('getItem', () => {
      it('should fetch a product by ID', async () => {
        const mockProduct = {
          id: 'gid://shopify/Product/123',
          title: 'Test Product',
          status: 'ACTIVE',
        };

        vi.spyOn(mockClient, 'query').mockResolvedValue({
          product: mockProduct,
        });

        const result = await getItem(mockClient, {
          id: 'gid://shopify/Product/123',
        });

        const parsed = JSON.parse(result);
        expect(parsed.id).toBe(mockProduct.id);
        expect(parsed.title).toBe(mockProduct.title);
      });

      it('should throw error when product not found', async () => {
        vi.spyOn(mockClient, 'query').mockResolvedValue({
          product: null,
        });

        await expect(
          getItem(mockClient, { id: 'gid://shopify/Product/999' })
        ).rejects.toThrow('Product not found');
      });
    });

    describe('listItems', () => {
      it('should list products with default limit', async () => {
        const mockProducts = {
          products: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Product/123',
                  title: 'Product 1',
                },
                cursor: 'abc123',
              },
              {
                node: {
                  id: 'gid://shopify/Product/124',
                  title: 'Product 2',
                },
                cursor: 'abc124',
              },
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: 'abc124',
            },
          },
        };

        vi.spyOn(mockClient, 'query').mockResolvedValue(mockProducts);

        const result = await listItems(mockClient, { limit: 10 });
        const parsed = JSON.parse(result);

        expect(parsed.products).toHaveLength(2);
        expect(parsed.count).toBe(2);
        expect(parsed.pageInfo.hasNextPage).toBe(true);
      });

      it('should support pagination with cursor', async () => {
        vi.spyOn(mockClient, 'query').mockResolvedValue({
          products: {
            edges: [],
            pageInfo: { hasNextPage: false },
          },
        });

        await listItems(mockClient, {
          limit: 10,
          cursor: 'next_page_cursor',
        });

        expect(mockClient.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            after: 'next_page_cursor',
          })
        );
      });

      it('should support search queries', async () => {
        vi.spyOn(mockClient, 'query').mockResolvedValue({
          products: {
            edges: [],
            pageInfo: { hasNextPage: false },
          },
        });

        await listItems(mockClient, {
          limit: 10,
          query: 'title:test',
        });

        expect(mockClient.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            query: 'title:test',
          })
        );
      });
    });

    describe('totalItems', () => {
      it('should return total product count', async () => {
        vi.spyOn(mockClient, 'query').mockResolvedValue({
          productsCount: { count: 42 },
        });

        const result = await totalItems(mockClient);
        const parsed = JSON.parse(result);

        expect(parsed.totalProducts).toBe(42);
        expect(parsed.timestamp).toBeDefined();
      });
    });
  });

  describe('Accounting/Sales Tools', () => {
    describe('getOrder', () => {
      it('should fetch an order by ID', async () => {
        const mockOrder = {
          id: 'gid://shopify/Order/456',
          name: '#1001',
          totalPriceSet: {
            shopMoney: {
              amount: '100.00',
              currencyCode: 'ISK',
            },
          },
        };

        vi.spyOn(mockClient, 'query').mockResolvedValue({
          order: mockOrder,
        });

        const result = await getOrder(mockClient, {
          id: 'gid://shopify/Order/456',
        });

        const parsed = JSON.parse(result);
        expect(parsed.id).toBe(mockOrder.id);
        expect(parsed.name).toBe(mockOrder.name);
      });

      it('should throw error when order not found', async () => {
        vi.spyOn(mockClient, 'query').mockResolvedValue({
          order: null,
        });

        await expect(
          getOrder(mockClient, { id: 'gid://shopify/Order/999' })
        ).rejects.toThrow('Order not found');
      });
    });

    describe('listSales', () => {
      it('should list orders with pagination', async () => {
        const mockOrders = {
          orders: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Order/456',
                  name: '#1001',
                },
                cursor: 'order_cursor_1',
              },
            ],
            pageInfo: {
              hasNextPage: false,
            },
          },
        };

        vi.spyOn(mockClient, 'query').mockResolvedValue(mockOrders);

        const result = await listSales(mockClient, { limit: 10 });
        const parsed = JSON.parse(result);

        expect(parsed.orders).toHaveLength(1);
        expect(parsed.count).toBe(1);
      });
    });

    describe('totalSales', () => {
      it('should calculate total sales from orders', async () => {
        const mockOrders = {
          orders: {
            edges: [
              {
                node: {
                  id: 'gid://shopify/Order/456',
                  totalPriceSet: {
                    shopMoney: {
                      amount: '100.50',
                      currencyCode: 'ISK',
                    },
                  },
                },
              },
              {
                node: {
                  id: 'gid://shopify/Order/457',
                  totalPriceSet: {
                    shopMoney: {
                      amount: '200.25',
                      currencyCode: 'ISK',
                    },
                  },
                },
              },
            ],
          },
        };

        vi.spyOn(mockClient, 'query').mockResolvedValue(mockOrders);

        const result = await totalSales(mockClient);
        const parsed = JSON.parse(result);

        expect(parsed.totalSales).toBe('300.75');
        expect(parsed.currencyCode).toBe('ISK');
        expect(parsed.orderCount).toBe(2);
      });

      it('should handle empty order list', async () => {
        // Clear cache first to avoid cached data from previous test
        vi.clearAllMocks();

        vi.spyOn(mockClient, 'query').mockResolvedValue({
          orders: { edges: [] },
        });

        const result = await totalSales(mockClient);
        const parsed = JSON.parse(result);

        expect(parsed.totalSales).toBe('0.00');
        expect(parsed.orderCount).toBe(0);
      });
    });
  });
});
