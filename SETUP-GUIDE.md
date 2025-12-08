# Shopify API Setup Guide

## Current Issue

The server is running correctly, but the Shopify API connection is failing with:
```
401 Unauthorized - Invalid API key or access token
```

This means you need to create a Shopify app and get valid API credentials.

## How to Get Shopify API Credentials

### Step 1: Create a Custom App in Shopify

1. Log in to your Shopify Admin panel
2. Go to **Settings** → **Apps and sales channels**
3. Click **Develop apps**
4. Click **Create an app**
5. Give it a name (e.g., "MCP Server")
6. Click **Create app**

### Step 2: Configure API Scopes

1. Click **Configure Admin API scopes**
2. Select the following scopes (minimum required):
   - **Products**: `read_products`
   - **Orders**: `read_orders`
   - **Inventory**: `read_inventory`

3. Click **Save**

### Step 3: Install the App

1. Click **Install app**
2. Confirm the installation
3. You'll see the **Admin API access token** - this is your `SHOPIFY_APP_SECRET`

### Step 4: Get API Credentials

After installation, you'll have:

- **API key** (also called Client ID) - this is `SHOPIFY_APP_CLIENT_ID`
- **Admin API access token** - this is `SHOPIFY_APP_SECRET`
  - Format: `shpat_xxxxx` (for custom apps) or `shpca_xxxxx` (for partner apps)
  - ⚠️ **Important**: Save this immediately, you won't be able to see it again!

### Step 5: Update Your .env File

```bash
SHOPIFY_APP_CLIENT_ID="your_api_key_here"
SHOPIFY_APP_SECRET="shpat_your_access_token_here"
SHOPIFY_APP_ENDPOINT="https://your-store.myshopify.com/admin/api/2025-01/graphql.json"
```

**Important Notes:**
- Replace `your-store` with your actual store name
- Use the latest API version (2025-01 or newer)
- The endpoint must end with `/graphql.json`

## Test Your Connection

Run this test script to verify your credentials:

```bash
node test-connection.js
```

You should see:
```
✅ Connection successful!
Shop data: { ... }
```

## Common Issues

### Issue: 401 Unauthorized
**Cause**: Invalid or expired access token
**Solution**:
- Regenerate the access token in Shopify Admin
- Make sure you're using `SHOPIFY_APP_SECRET` not `SHOPIFY_APP_CLIENT_ID`
- Check that the token starts with `shpat_` or `shpca_`

### Issue: 403 Forbidden
**Cause**: Missing API scopes
**Solution**:
- Go back to your app settings
- Add required scopes: `read_products`, `read_orders`
- Reinstall the app

### Issue: 404 Not Found
**Cause**: Wrong API endpoint URL
**Solution**:
- Verify your store name in the URL
- Make sure endpoint ends with `/graphql.json`
- Use the correct API version

### Issue: 422 Unprocessable Entity
**Cause**: GraphQL query syntax error
**Solution**:
- Check the query in [src/shopify/queries.ts](src/shopify/queries.ts)
- Test queries in Shopify GraphiQL explorer

## Alternative: Using REST API (Not Recommended)

If you need to use the REST API instead:

1. Your endpoint would be: `https://your-store.myshopify.com/admin/api/2025-01`
2. You'd need to modify the client to use REST instead of GraphQL
3. Note: REST API is legacy and GraphQL is recommended

## Verify MCP Server

Once your credentials are valid, test the MCP server:

### Test HTTP/SSE Server
```bash
# Start server
node dist/http-server.js

# In another terminal
npx @modelcontextprotocol/inspector http://localhost:3022/sse
```

### Test Stdio Server
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Available MCP Tools

Once connected, you can test these tools in the inspector:

1. **total_items** - Get count of products (easiest test, no parameters needed)
2. **list_items** - List products (use `{"limit": 5}`)
3. **total_sales** - Calculate total sales
4. **list_sales** - List orders (use `{"limit": 5}`)

## Need Help?

If you're still having issues:

1. Check your Shopify store is active and accessible
2. Verify the app is installed in your store
3. Make sure you're using a valid API version (2023-10, 2024-01, 2025-01, etc.)
4. Check Shopify API status: https://status.shopify.com/
5. Review Shopify API documentation: https://shopify.dev/docs/api/admin-graphql

## Current Configuration

Your current `.env` file has:
- Store: `your-store.myshopify.com`
- API Version: `2023-10`
- Endpoint: Correctly formatted with `/graphql.json`

The issue is the access token (`SHOPIFY_APP_SECRET`) needs to be regenerated from your Shopify Admin panel following the steps above.
