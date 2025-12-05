# Shopify MCP Server

A Model Context Protocol (MCP) server that provides comprehensive integration with Shopify, enabling AI assistants to access accounting, inventory management, and business analytics features.

## Features

This MCP server provides three main categories of tools:

### 📊 Accounting Tools
- **get_orders**: Retrieve orders with filtering by status and financial status
- **get_financial_summary**: Get financial summaries including revenue, order counts, and metrics
- **get_transactions**: View transaction details for specific orders

### 📦 Inventory Tools
- **get_inventory_levels**: Check current inventory levels across locations
- **get_products**: Retrieve product information with variants and pricing
- **update_inventory**: Update inventory quantities at specific locations

### 📈 Summary & Analytics Tools
- **get_store_summary**: Get a comprehensive overview of your store
- **get_sales_summary**: Analyze sales with top products and customer metrics
- **get_product_analytics**: Deep dive into individual product performance

## Installation

```bash
npm install
npm run build
```

## Configuration

This server requires Shopify API credentials. You'll need:

1. A Shopify store
2. A custom app or admin API access token
3. The following environment variables:

```bash
export SHOPIFY_SHOP_NAME="your-shop-name"  # Just the name, not the full URL
export SHOPIFY_ACCESS_TOKEN="your-access-token"
```

### Getting Shopify API Credentials

1. Go to your Shopify admin panel
2. Navigate to Settings > Apps and sales channels > Develop apps
3. Create a new app or select an existing one
4. Configure Admin API access scopes (required scopes):
   - `read_products`
   - `write_products`
   - `read_orders`
   - `read_inventory`
   - `write_inventory`
5. Install the app and copy the Admin API access token

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file:

### MacOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shopify": {
      "command": "node",
      "args": ["/path/to/mcp-shopify/dist/index.js"],
      "env": {
        "SHOPIFY_SHOP_NAME": "your-shop-name",
        "SHOPIFY_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

Or using npx:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": ["-y", "mcp-shopify"],
      "env": {
        "SHOPIFY_SHOP_NAME": "your-shop-name",
        "SHOPIFY_ACCESS_TOKEN": "your-access-token"
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Available Tools

### Accounting

#### get_orders
Retrieve orders from Shopify with filtering options.

**Parameters:**
- `status` (optional): Filter by order status - "any", "open", "closed", "cancelled"
- `financial_status` (optional): Filter by financial status - "paid", "pending", "refunded", etc.
- `limit` (optional): Maximum number of orders to return (1-250, default: 50)

**Example:**
```
Get the last 100 paid orders
```

#### get_financial_summary
Get aggregated financial metrics for a time period.

**Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Returns:**
- Total orders
- Total revenue
- Average order value
- Breakdown by financial status

**Example:**
```
Show me the financial summary for the last 7 days
```

#### get_transactions
Get detailed transaction information for a specific order.

**Parameters:**
- `order_id` (required): The Shopify order ID

**Example:**
```
Get transactions for order gid://shopify/Order/123456789
```

### Inventory

#### get_inventory_levels
Check inventory levels across your locations.

**Parameters:**
- `location_id` (optional): Filter by specific location
- `limit` (optional): Maximum items to return (default: 50)

**Example:**
```
Show me current inventory levels
```

#### get_products
Retrieve product catalog with variants and pricing.

**Parameters:**
- `status` (optional): Filter by status - "active", "archived", "draft" (default: "active")
- `limit` (optional): Maximum products to return (default: 50)

**Example:**
```
Get all active products
```

#### update_inventory
Update inventory quantity for a product variant at a location.

**Parameters:**
- `inventory_item_id` (required): The inventory item ID
- `location_id` (required): The location ID
- `available` (required): New quantity

**Example:**
```
Set inventory for item gid://shopify/InventoryItem/123 at location gid://shopify/Location/456 to 100 units
```

### Summaries & Analytics

#### get_store_summary
Get a high-level overview of your entire store.

**Returns:**
- Total product count
- Recent order statistics
- Revenue summary

**Example:**
```
Give me a store overview
```

#### get_sales_summary
Detailed sales analytics with top products and trends.

**Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Returns:**
- Total orders and revenue
- Unique customer count
- Average order value
- Top 10 products by revenue

**Example:**
```
Show me sales analytics for the past 90 days
```

#### get_product_analytics
Analyze performance for a specific product.

**Parameters:**
- `product_id` (required): The Shopify product ID

**Returns:**
- Product details
- Total quantity sold
- Total revenue
- Inventory turnover rate

**Example:**
```
Analyze product gid://shopify/Product/123456789
```

## Error Handling

The server includes comprehensive error handling:
- Validates environment variables on startup
- Checks for required parameters in tool calls
- Returns detailed error messages for debugging
- Handles Shopify API errors gracefully

## Security Notes

- Never commit your Shopify access token to version control
- Use environment variables or secure configuration management
- Limit API scope to only required permissions
- Regularly rotate access tokens
- Monitor API usage in your Shopify admin

## Troubleshooting

### "Configuration error" on startup
- Ensure `SHOPIFY_SHOP_NAME` and `SHOPIFY_ACCESS_TOKEN` are set
- Verify your shop name is correct (without .myshopify.com)

### "Access denied" errors
- Check that your app has the required API scopes
- Verify the access token is valid and hasn't expired

### Rate limiting
- Shopify has API rate limits (typically 2 requests/second for REST, 50 points/second for GraphQL)
- The server uses GraphQL which is more efficient
- Consider implementing caching for frequently accessed data

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues related to:
- This MCP server: Open an issue on GitHub
- Shopify API: Check [Shopify API documentation](https://shopify.dev/api)
- MCP protocol: See [Model Context Protocol documentation](https://modelcontextprotocol.io)