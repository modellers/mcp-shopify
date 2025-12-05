#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { shopifyApi, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/node";

// Environment variable schema
const EnvSchema = z.object({
  SHOPIFY_SHOP_NAME: z.string().min(1, "SHOPIFY_SHOP_NAME is required"),
  SHOPIFY_ACCESS_TOKEN: z.string().min(1, "SHOPIFY_ACCESS_TOKEN is required"),
});

// Validate environment variables
function getConfig() {
  const result = EnvSchema.safeParse({
    SHOPIFY_SHOP_NAME: process.env.SHOPIFY_SHOP_NAME,
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
  });

  if (!result.success) {
    console.error("Configuration error:");
    console.error(result.error.issues.map((i) => `  - ${i.message}`).join("\n"));
    process.exit(1);
  }

  return result.data;
}

const config = getConfig();

// Initialize Shopify client
const shopify = shopifyApi({
  // For custom apps, apiSecretKey is required by the SDK but not used for authentication.
  // Only adminApiAccessToken is actually used for API calls.
  apiSecretKey: "not-needed-for-custom-app",
  adminApiAccessToken: config.SHOPIFY_ACCESS_TOKEN,
  apiVersion: ApiVersion.October24,
  isCustomStoreApp: true,
  isEmbeddedApp: false,
  hostName: `${config.SHOPIFY_SHOP_NAME}.myshopify.com`,
});

// Create a session for API calls
const session = shopify.session.customAppSession(`${config.SHOPIFY_SHOP_NAME}.myshopify.com`);
session.accessToken = config.SHOPIFY_ACCESS_TOKEN;

// Create GraphQL client
const client = new shopify.clients.Graphql({ session });

// Define tools
const TOOLS: Tool[] = [
  // Accounting Tools
  {
    name: "get_orders",
    description:
      "Retrieve orders from Shopify for accounting purposes. Returns order details including financial status, totals, and line items.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filter orders by status: any, open, closed, cancelled",
          enum: ["any", "open", "closed", "cancelled"],
          default: "any",
        },
        financial_status: {
          type: "string",
          description:
            "Filter by financial status: any, authorized, pending, paid, partially_paid, refunded, voided, partially_refunded, unpaid",
          enum: [
            "any",
            "authorized",
            "pending",
            "paid",
            "partially_paid",
            "refunded",
            "voided",
            "partially_refunded",
            "unpaid",
          ],
        },
        limit: {
          type: "number",
          description: "Maximum number of orders to return (1-250)",
          default: 50,
        },
      },
    },
  },
  {
    name: "get_financial_summary",
    description:
      "Get a financial summary including total sales, order counts, and revenue metrics for a specified period.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to include in the summary",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_transactions",
    description:
      "Retrieve transaction details for a specific order, including payment information and status.",
    inputSchema: {
      type: "object",
      properties: {
        order_id: {
          type: "string",
          description: "The ID of the order to get transactions for",
        },
      },
      required: ["order_id"],
    },
  },
  // Inventory Tools
  {
    name: "get_inventory_levels",
    description:
      "Retrieve current inventory levels for products. Shows stock quantities across locations.",
    inputSchema: {
      type: "object",
      properties: {
        location_id: {
          type: "string",
          description: "Filter by specific location ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of items to return",
          default: 50,
        },
      },
    },
  },
  {
    name: "get_products",
    description:
      "Retrieve product information including variants, prices, and inventory tracking status.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by product status",
          enum: ["active", "archived", "draft"],
          default: "active",
        },
        limit: {
          type: "number",
          description: "Maximum number of products to return",
          default: 50,
        },
      },
    },
  },
  {
    name: "update_inventory",
    description:
      "Update inventory levels for a specific product variant at a location.",
    inputSchema: {
      type: "object",
      properties: {
        inventory_item_id: {
          type: "string",
          description: "The inventory item ID to update",
        },
        location_id: {
          type: "string",
          description: "The location ID where inventory should be updated",
        },
        available: {
          type: "number",
          description: "The new available quantity",
        },
      },
      required: ["inventory_item_id", "location_id", "available"],
    },
  },
  // Summary Tools
  {
    name: "get_store_summary",
    description:
      "Get a comprehensive summary of the store including product count, order statistics, and inventory overview.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_sales_summary",
    description:
      "Get detailed sales analytics including top products, revenue trends, and customer metrics.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_product_analytics",
    description:
      "Get analytics for a specific product including sales, revenue, and inventory turnover.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "The product ID to analyze",
        },
      },
      required: ["product_id"],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: "mcp-shopify",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler for listing tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_orders": {
        const status = (args?.status as string) || "any";
        const financial_status = args?.financial_status as string | undefined;
        const limit = Math.min((args?.limit as number) || 50, 250);

        const query = `
          query getOrders($first: Int!, $query: String) {
            orders(first: $first, query: $query) {
              edges {
                node {
                  id
                  name
                  createdAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  financialStatus
                  fulfillmentStatus
                  lineItems(first: 10) {
                    edges {
                      node {
                        title
                        quantity
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                  customer {
                    email
                    displayName
                  }
                }
              }
            }
          }
        `;

        let queryString = "";
        if (status !== "any") {
          queryString += `status:${status}`;
        }
        if (financial_status && financial_status !== "any") {
          if (queryString) queryString += " AND ";
          queryString += `financial_status:${financial_status}`;
        }

        const response = await client.query({
          data: {
            query,
            variables: {
              first: limit,
              query: queryString || undefined,
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "get_financial_summary": {
        const days = (args?.days as number) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query = `
          query getFinancialSummary($query: String) {
            orders(first: 250, query: $query) {
              edges {
                node {
                  id
                  createdAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  financialStatus
                }
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query,
            variables: {
              query: `created_at:>='${startDate.toISOString()}'`,
            },
          },
        });

        const orders = (response.body as any).data.orders.edges;
        const summary = {
          period_days: days,
          total_orders: orders.length,
          total_revenue: orders.reduce(
            (sum: number, edge: any) =>
              sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount),
            0
          ),
          currency: orders[0]?.node.totalPriceSet.shopMoney.currencyCode || "USD",
          average_order_value:
            orders.length > 0
              ? orders.reduce(
                  (sum: number, edge: any) =>
                    sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount),
                  0
                ) / orders.length
              : 0,
          by_status: orders.reduce((acc: any, edge: any) => {
            const status = edge.node.financialStatus;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {}),
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "get_transactions": {
        const orderId = args?.order_id as string;
        if (!orderId) {
          throw new Error("order_id is required");
        }

        const query = `
          query getTransactions($id: ID!) {
            order(id: $id) {
              id
              name
              transactions {
                id
                kind
                status
                amount
                gateway
                createdAt
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query,
            variables: { id: orderId },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "get_inventory_levels": {
        const locationId = args?.location_id as string | undefined;
        const limit = Math.min((args?.limit as number) || 50, 250);

        const query = `
          query getInventoryLevels($first: Int!, $locationId: ID) {
            inventoryItems(first: $first) {
              edges {
                node {
                  id
                  sku
                  tracked
                  inventoryLevels(first: 10, locationId: $locationId) {
                    edges {
                      node {
                        available
                        location {
                          id
                          name
                        }
                      }
                    }
                  }
                  variant {
                    displayName
                    price
                  }
                }
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query,
            variables: {
              first: limit,
              locationId: locationId || undefined,
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "get_products": {
        const status = (args?.status as string) || "active";
        const limit = Math.min((args?.limit as number) || 50, 250);

        const query = `
          query getProducts($first: Int!, $query: String) {
            products(first: $first, query: $query) {
              edges {
                node {
                  id
                  title
                  status
                  totalInventory
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        title
                        price
                        sku
                        inventoryQuantity
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query,
            variables: {
              first: limit,
              query: `status:${status}`,
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "update_inventory": {
        const inventoryItemId = args?.inventory_item_id as string;
        const locationId = args?.location_id as string;
        const available = args?.available as number;

        if (!inventoryItemId || !locationId || available === undefined) {
          throw new Error("inventory_item_id, location_id, and available are required");
        }

        const mutation = `
          mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
            inventorySetQuantities(input: $input) {
              inventoryAdjustmentGroup {
                reason
                changes {
                  name
                  delta
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query: mutation,
            variables: {
              input: {
                reason: "correction",
                quantities: [
                  {
                    inventoryItemId,
                    locationId,
                    name: "available",
                    quantity: available,
                  },
                ],
              },
            },
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.body, null, 2),
            },
          ],
        };
      }

      case "get_store_summary": {
        const productsQuery = `
          query getProducts {
            products(first: 250) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `;

        const ordersQuery = `
          query getOrders {
            orders(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `;

        const [productsResponse, ordersResponse] = await Promise.all([
          client.query({ data: { query: productsQuery } }),
          client.query({ data: { query: ordersQuery } }),
        ]);

        // Get recent orders for financial summary
        const recentOrdersQuery = `
          query getRecentOrders {
            orders(first: 100) {
              edges {
                node {
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  financialStatus
                }
              }
            }
          }
        `;

        const recentOrdersResponse = await client.query({
          data: { query: recentOrdersQuery },
        });

        const orders = (recentOrdersResponse.body as any).data.orders.edges;
        const products = (productsResponse.body as any).data.products.edges;
        const totalRevenue = orders.reduce(
          (sum: number, edge: any) =>
            sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount),
          0
        );

        const summary = {
          store_name: config.SHOPIFY_SHOP_NAME,
          products: {
            total: products.length,
          },
          orders: {
            recent_count: orders.length,
            total_revenue: totalRevenue,
            currency: orders[0]?.node.totalPriceSet.shopMoney.currencyCode || "USD",
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "get_sales_summary": {
        const days = (args?.days as number) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query = `
          query getSalesSummary($query: String) {
            orders(first: 250, query: $query) {
              edges {
                node {
                  id
                  createdAt
                  totalPriceSet {
                    shopMoney {
                      amount
                      currencyCode
                    }
                  }
                  lineItems(first: 50) {
                    edges {
                      node {
                        title
                        quantity
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                          }
                        }
                        product {
                          id
                          title
                        }
                      }
                    }
                  }
                  customer {
                    id
                    email
                  }
                }
              }
            }
          }
        `;

        const response = await client.query({
          data: {
            query,
            variables: {
              query: `created_at:>='${startDate.toISOString()}'`,
            },
          },
        });

        const orders = (response.body as any).data.orders.edges;

        // Calculate top products
        const productSales: { [key: string]: { title: string; quantity: number; revenue: number } } = {};
        const customers = new Set();

        orders.forEach((orderEdge: any) => {
          if (orderEdge.node.customer?.id) {
            customers.add(orderEdge.node.customer.id);
          }

          orderEdge.node.lineItems.edges.forEach((lineItem: any) => {
            const productId = lineItem.node.product?.id || "unknown";
            const title = lineItem.node.product?.title || lineItem.node.title;
            const quantity = lineItem.node.quantity;
            const revenue =
              quantity * parseFloat(lineItem.node.originalUnitPriceSet.shopMoney.amount);

            if (!productSales[productId]) {
              productSales[productId] = { title, quantity: 0, revenue: 0 };
            }
            productSales[productId].quantity += quantity;
            productSales[productId].revenue += revenue;
          });
        });

        const topProducts = Object.entries(productSales)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .slice(0, 10)
          .map(([id, data]) => ({
            product_id: id,
            title: data.title,
            quantity_sold: data.quantity,
            revenue: data.revenue,
          }));

        const totalRevenue = orders.reduce(
          (sum: number, edge: any) =>
            sum + parseFloat(edge.node.totalPriceSet.shopMoney.amount),
          0
        );

        const summary = {
          period_days: days,
          total_orders: orders.length,
          total_revenue: totalRevenue,
          currency: orders[0]?.node.totalPriceSet.shopMoney.currencyCode || "USD",
          unique_customers: customers.size,
          average_order_value: orders.length > 0 ? totalRevenue / orders.length : 0,
          top_products: topProducts,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      }

      case "get_product_analytics": {
        const productId = args?.product_id as string;
        if (!productId) {
          throw new Error("product_id is required");
        }

        // Get product details
        const productQuery = `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              totalInventory
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                  }
                }
              }
            }
          }
        `;

        const productResponse = await client.query({
          data: {
            query: productQuery,
            variables: { id: productId },
          },
        });

        // Get orders containing this product
        const ordersQuery = `
          query getOrdersForProduct {
            orders(first: 250) {
              edges {
                node {
                  createdAt
                  lineItems(first: 50) {
                    edges {
                      node {
                        product {
                          id
                        }
                        quantity
                        originalUnitPriceSet {
                          shopMoney {
                            amount
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const ordersResponse = await client.query({
          data: { query: ordersQuery },
        });

        const product = (productResponse.body as any).data.product;
        const orders = (ordersResponse.body as any).data.orders.edges;

        let totalQuantitySold = 0;
        let totalRevenue = 0;

        orders.forEach((orderEdge: any) => {
          orderEdge.node.lineItems.edges.forEach((lineItem: any) => {
            if (lineItem.node.product?.id === productId) {
              totalQuantitySold += lineItem.node.quantity;
              totalRevenue +=
                lineItem.node.quantity *
                parseFloat(lineItem.node.originalUnitPriceSet.shopMoney.amount);
            }
          });
        });

        const analytics = {
          product: {
            id: product.id,
            title: product.title,
            total_inventory: product.totalInventory,
            variants_count: product.variants.edges.length,
          },
          sales: {
            total_quantity_sold: totalQuantitySold,
            total_revenue: totalRevenue,
          },
          inventory: {
            current_stock: product.totalInventory,
            turnover_rate:
              product.totalInventory > 0
                ? (totalQuantitySold / product.totalInventory) * 100
                : 0,
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Shopify MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
