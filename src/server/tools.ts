import { z } from 'zod';
import { ShopifyClient } from '../shopify/client.js';
import { CacheWrapper } from '../shopify/cache-wrapper.js';
import {
  GET_PRODUCT,
  LIST_PRODUCTS,
  PRODUCTS_COUNT,
  GET_ORDER,
  LIST_ORDERS,
  ProductNode,
  OrderNode,
} from '../shopify/queries.js';
import { logger } from '../utils/logger.js';

/**
 * Tool handlers for MCP server
 * Implements inventory and accounting (sales) tools
 */

// Zod schemas for input validation
export const GetItemSchema = z.object({
  id: z.string().describe('Product ID (e.g., gid://shopify/Product/123)'),
});

export const ListItemsSchema = z.object({
  limit: z.number().min(1).max(100).default(10).describe('Number of items to return (1-100)'),
  cursor: z.string().optional().describe('Pagination cursor for next page'),
  query: z.string().optional().describe('Search query to filter products'),
});

export const GetOrderSchema = z.object({
  id: z.string().describe('Order ID (e.g., gid://shopify/Order/123)'),
});

export const ListSalesSchema = z.object({
  limit: z.number().min(1).max(100).default(10).describe('Number of orders to return (1-100)'),
  cursor: z.string().optional().describe('Pagination cursor for next page'),
  query: z.string().optional().describe('Search query to filter orders'),
});

// Cache instances for different data types
const productCache = new CacheWrapper<any>(60); // 60 second TTL
const orderCache = new CacheWrapper<any>(30); // 30 second TTL for orders

/**
 * Inventory Tools
 */

export async function getItem(
  client: ShopifyClient,
  args: z.infer<typeof GetItemSchema>
): Promise<string> {
  logger.info(`Getting product: ${args.id}`);

  const cacheKey = `product:${args.id}`;

  const data = await productCache.get(cacheKey, async () => {
    return await client.query<{ product: ProductNode }>(GET_PRODUCT, { id: args.id });
  });

  if (!data.product) {
    throw new Error(`Product not found: ${args.id}`);
  }

  return JSON.stringify(data.product, null, 2);
}

export async function listItems(
  client: ShopifyClient,
  args: z.infer<typeof ListItemsSchema>
): Promise<string> {
  logger.info(`Listing products (limit: ${args.limit}, cursor: ${args.cursor || 'none'})`);

  const cacheKey = `products:${args.limit}:${args.cursor || 'first'}:${args.query || 'all'}`;

  const data = await productCache.get(cacheKey, async () => {
    return await client.query<{ products: { edges: Array<{ node: ProductNode; cursor: string }>; pageInfo: any } }>(
      LIST_PRODUCTS,
      {
        first: args.limit,
        after: args.cursor,
        query: args.query,
      }
    );
  });

  const result = {
    products: data.products.edges.map((edge: any) => edge.node),
    pageInfo: data.products.pageInfo,
    count: data.products.edges.length,
  };

  return JSON.stringify(result, null, 2);
}

export async function totalItems(client: ShopifyClient): Promise<string> {
  logger.info('Getting total product count');

  const cacheKey = 'products:count';

  const data = await productCache.get(cacheKey, async () => {
    return await client.query<{ productsCount: { count: number } }>(PRODUCTS_COUNT);
  });

  const result = {
    totalProducts: data.productsCount.count,
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(result, null, 2);
}

/**
 * Accounting/Sales Tools
 */

export async function getOrder(
  client: ShopifyClient,
  args: z.infer<typeof GetOrderSchema>
): Promise<string> {
  logger.info(`Getting order: ${args.id}`);

  const cacheKey = `order:${args.id}`;

  const data = await orderCache.get(cacheKey, async () => {
    return await client.query<{ order: OrderNode }>(GET_ORDER, { id: args.id });
  });

  if (!data.order) {
    throw new Error(`Order not found: ${args.id}`);
  }

  return JSON.stringify(data.order, null, 2);
}

export async function listSales(
  client: ShopifyClient,
  args: z.infer<typeof ListSalesSchema>
): Promise<string> {
  logger.info(`Listing orders (limit: ${args.limit}, cursor: ${args.cursor || 'none'})`);

  const cacheKey = `orders:${args.limit}:${args.cursor || 'first'}:${args.query || 'all'}`;

  const data = await orderCache.get(cacheKey, async () => {
    return await client.query<{ orders: { edges: Array<{ node: OrderNode; cursor: string }>; pageInfo: any } }>(
      LIST_ORDERS,
      {
        first: args.limit,
        after: args.cursor,
        query: args.query,
      }
    );
  });

  const result = {
    orders: data.orders.edges.map((edge: any) => edge.node),
    pageInfo: data.orders.pageInfo,
    count: data.orders.edges.length,
  };

  return JSON.stringify(result, null, 2);
}

export async function totalSales(client: ShopifyClient): Promise<string> {
  logger.info('Calculating total sales');

  const cacheKey = 'sales:total';

  const data = await orderCache.get(cacheKey, async () => {
    // Fetch a larger batch to calculate totals (max 100 at a time)
    return await client.query<{ orders: { edges: Array<{ node: OrderNode }> } }>(
      LIST_ORDERS,
      {
        first: 100,
        query: 'financial_status:paid OR financial_status:partially_paid',
      }
    );
  });

  // Calculate total sales from orders
  let totalAmount = 0;
  let currencyCode = 'USD';

  data.orders.edges.forEach((edge: any) => {
    const order = edge.node;
    if (order.totalPriceSet?.shopMoney) {
      totalAmount += parseFloat(order.totalPriceSet.shopMoney.amount);
      currencyCode = order.totalPriceSet.shopMoney.currencyCode;
    }
  });

  const result = {
    totalSales: totalAmount.toFixed(2),
    currencyCode,
    orderCount: data.orders.edges.length,
    note: 'Based on last 100 paid/partially paid orders',
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(result, null, 2);
}
