# Shopify MCP Server

## Project Overview

**Type:** Model Context Protocol (MCP) Server
**Purpose:** Enable AI assistants to manage ConsignCloud inventory, sales, and accounts
**Language:** TypeScript
**Runtime:** Node.js

## Available tools

Allows user to get endpoints (not create, update or delete)

### Inventory
    - get_item
    - list_items
    - total_items

### Accounting
    - get_item
    - list_sales
    - total_sales

## Technical stack

Supporting stdio / sse / http-streaming

    - Typescript
    - @modelcontextprotocol/sdk

Strong logging showing user what is going. Follows best MCP practices. 

### HTTP/SSE Server Enhancements

**CLI Argument Support**
- Override env vars: `node dist/http-server.js --api-key KEY --port 3001`
- Priority: CLI args > env vars > .env file

 **Enhanced Error Logging**
- HTTP status code explanations (401, 403, 404, 422, 429, 500+)
- Request context (method, URL)
- Validation error parsing
- Network error detection

 **Security**
- API keys masked in logs (shows first 8 and last 4 chars)
- Configuration displayed on startup for transparency

## Configuration
Is loaded from env variables
    - SHOPIFY_APP_CLIENT_ID="..."
    - SHOPIFY_APP_SECRET="shpss_..."
    - SHOPIFY_APP_ENDPOINT="https://{store}.myshopify.com/admin/api/2025-10/graphql.json"  (settings > domains)
    - STORE_COUNTRY=IS
    - STORE_CURRENCY=ISK
    - STORE_LOCALE=is-IS
    - HTTP_PORT=3022
    - HTTP_SERVER=localhost

See .env.example


## Development and tests

When testing we should have 1-3 second timeout randomly to not overwhelm the api. We wrap the main API with cache-wrapper.ts

**Test with inspector (stdio):**
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

**Test with inspector (HTTP):**
```bash
npx @modelcontextprotocol/inspector http://localhost:3000/sse
```

**Build:**
```bash
npm run build
```
