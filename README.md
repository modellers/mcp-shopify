# MCP Shopify Server

Model Context Protocol (MCP) server for Shopify inventory and sales management. Provides read-only access to Shopify products and orders through standardized MCP tools.

## Features

✅ **Read-only operations** - GET/LIST endpoints only (no create, update, or delete)
✅ **Inventory management** - Get products, list items, count total inventory
✅ **Sales tracking** - Get orders, list sales, calculate total revenue
✅ **Multiple transports** - Supports stdio, SSE, and HTTP streaming
✅ **Smart caching** - Built-in cache with 1-3 second delays to prevent API rate limiting
✅ **Comprehensive logging** - Detailed error messages with HTTP status explanations
✅ **Secure** - API keys masked in logs, environment-based configuration

## Available Tools

### Inventory (GET/LIST)

- **get_item** - Get a single product by ID
- **list_items** - List products with pagination support
- **total_items** - Get total count of products in inventory

### Accounting/Sales (GET/LIST)

- **get_order** - Get a single order by ID
- **list_sales** - List orders with financial data and pagination
- **total_sales** - Calculate total sales revenue from orders

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
# Required: Get from Shopify Admin > Settings > Apps and sales channels > Develop apps
SHOPIFY_APP_CLIENT_ID="your_client_id"
SHOPIFY_APP_SECRET="shpss_your_secret"
SHOPIFY_APP_ENDPOINT="https://your-store.myshopify.com/admin/api/2025-10/graphql.json"

# Optional: Store settings
STORE_COUNTRY=IS
STORE_CURRENCY=ISK
STORE_LOCALE=is-IS

# Optional: HTTP server settings
HTTP_PORT=3022
HTTP_SERVER=localhost
```

### CLI Argument Overrides

You can override environment variables via CLI arguments:

```bash
node dist/http-server.js --api-key shpss_xxx --port 3001 --endpoint https://...
```

Priority: **CLI args > env vars > .env file**

## Usage

### Stdio Transport (for CLI)

```bash
# Run directly
node dist/index.js

# Test with MCP Inspector
npm run inspector:stdio
# or
npx @modelcontextprotocol/inspector node dist/index.js
```

### HTTP/SSE Transport (for web)

```bash
# Start HTTP server
node dist/http-server.js

# Test with MCP Inspector
npm run inspector:http
# or
npx @modelcontextprotocol/inspector http://localhost:3022/sse
```

### Health Check

```bash
curl http://localhost:3022/health
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test                  # Run all tests once
npm run test:watch        # Watch mode
npm run test:ui           # Interactive UI
npm run test:coverage     # With coverage report

# Enable debug logging
DEBUG=true node dist/index.js
```

## Testing

The project includes comprehensive tests covering:
- ✅ Configuration validation and API key masking
- ✅ HTTP error handling (401, 403, 404, 422, 429, 500+)
- ✅ GraphQL error handling
- ✅ All 6 MCP tools (get_item, list_items, total_items, get_order, list_sales, total_sales)

Run tests with: `npm test`

See [TEST_SUMMARY.md](TEST_SUMMARY.md) for detailed test documentation.

## Tool Examples

### Get a Product

```json
{
  "name": "get_item",
  "arguments": {
    "id": "gid://shopify/Product/123456789"
  }
}
```

### List Products

```json
{
  "name": "list_items",
  "arguments": {
    "limit": 10,
    "query": "status:active"
  }
}
```

### Get Total Inventory

```json
{
  "name": "total_items",
  "arguments": {}
}
```

### List Sales/Orders

```json
{
  "name": "list_sales",
  "arguments": {
    "limit": 20,
    "query": "financial_status:paid"
  }
}
```

### Calculate Total Sales

```json
{
  "name": "total_sales",
  "arguments": {}
}
```

## Architecture

```
src/
├── config/
│   └── env.ts              # Environment configuration with CLI args
├── utils/
│   └── logger.ts           # Logging utility with API key masking
├── shopify/
│   ├── client.ts           # GraphQL client with error handling
│   ├── queries.ts          # GraphQL query definitions
│   └── cache-wrapper.ts    # Caching with random delays
├── server/
│   ├── mcp-server.ts       # Core MCP server setup
│   └── tools.ts            # Tool handlers (6 endpoints)
├── index.ts                # Stdio transport entry
└── http-server.ts          # HTTP/SSE transport entry
```

## Error Handling

The server provides detailed error messages with HTTP status explanations:

- **401** - Authentication failed (check SHOPIFY_APP_SECRET)
- **403** - Insufficient permissions (verify API scopes)
- **404** - Resource not found (check endpoint URL)
- **422** - Validation error (review query syntax)
- **429** - Rate limit exceeded (cache helps prevent this)
- **500+** - Server errors (retry after delay)

## Security

- API keys are masked in logs (shows first 8 + last 4 characters)
- All configuration displayed on startup for transparency
- Read-only operations only - no mutations
- Environment-based secrets management

## Rate Limiting

The built-in cache wrapper adds random 1-3 second delays between API calls to prevent overwhelming the Shopify API. Cache TTL:

- Products: 60 seconds
- Orders: 30 seconds

## License

ISC

## Support

For issues and feature requests, visit: https://github.com/modellers/mcp-shopify/issues