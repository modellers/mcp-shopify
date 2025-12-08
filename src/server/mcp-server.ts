import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ShopifyClient } from '../shopify/client.js';
import { EnvConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  getItem,
  listItems,
  totalItems,
  getOrder,
  listSales,
  totalSales,
  GetItemSchema,
  ListItemsSchema,
  GetOrderSchema,
  ListSalesSchema,
} from './tools.js';

/**
 * Create and configure the MCP server
 */
export function createMCPServer(config: EnvConfig): Server {
  const shopifyClient = new ShopifyClient(config);

  const server = new Server(
    {
      name: 'mcp-shopify',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  /**
   * List available tools
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug('Listing available tools');

    return {
      tools: [
        // Inventory tools
        {
          name: 'get_item',
          description: 'Get a single product by ID from Shopify inventory',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Product ID (e.g., gid://shopify/Product/123)',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_items',
          description: 'List products from Shopify inventory with pagination support',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of items to return (1-100)',
                minimum: 1,
                maximum: 100,
                default: 10,
              },
              cursor: {
                type: 'string',
                description: 'Pagination cursor for next page',
              },
              query: {
                type: 'string',
                description: 'Search query to filter products',
              },
            },
          },
        },
        {
          name: 'total_items',
          description: 'Get total count of products in Shopify inventory',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // Accounting/Sales tools
        {
          name: 'get_order',
          description: 'Get a single order by ID from Shopify',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Order ID (e.g., gid://shopify/Order/123)',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_sales',
          description: 'List orders from Shopify with financial data and pagination support',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of orders to return (1-100)',
                minimum: 1,
                maximum: 100,
                default: 10,
              },
              cursor: {
                type: 'string',
                description: 'Pagination cursor for next page',
              },
              query: {
                type: 'string',
                description: 'Search query to filter orders',
              },
            },
          },
        },
        {
          name: 'total_sales',
          description: 'Calculate total sales revenue from Shopify orders',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  /**
   * Handle tool calls
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    logger.info(`Tool called: ${name}`, args);

    try {
      let result: string;

      switch (name) {
        // Inventory tools
        case 'get_item': {
          const validatedArgs = GetItemSchema.parse(args);
          result = await getItem(shopifyClient, validatedArgs);
          break;
        }

        case 'list_items': {
          const validatedArgs = ListItemsSchema.parse(args || {});
          result = await listItems(shopifyClient, validatedArgs);
          break;
        }

        case 'total_items': {
          result = await totalItems(shopifyClient);
          break;
        }

        // Accounting/Sales tools
        case 'get_order': {
          const validatedArgs = GetOrderSchema.parse(args);
          result = await getOrder(shopifyClient, validatedArgs);
          break;
        }

        case 'list_sales': {
          const validatedArgs = ListSalesSchema.parse(args || {});
          result = await listSales(shopifyClient, validatedArgs);
          break;
        }

        case 'total_sales': {
          result = await totalSales(shopifyClient);
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      logger.info(`Tool ${name} completed successfully`);

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      logger.error(`Tool ${name} failed`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: errorMessage,
                tool: name,
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Run the MCP server with stdio transport
 */
export async function runStdioServer(config: EnvConfig): Promise<void> {
  logger.info('Starting MCP Shopify Server (stdio transport)');
  logger.logConfig(
    {
      endpoint: config.SHOPIFY_APP_ENDPOINT,
      clientId: config.SHOPIFY_APP_CLIENT_ID,
      secret: config.SHOPIFY_APP_SECRET,
      country: config.STORE_COUNTRY,
      currency: config.STORE_CURRENCY,
      locale: config.STORE_LOCALE,
    },
    ['secret']
  );

  const server = createMCPServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info('MCP server running on stdio transport');
}
