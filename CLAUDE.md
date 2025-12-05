# Shopify MCP Server

Allows user to get endpoints (not create, update or delete)

  - inventory
    - get_item
    - list_items
    - total_items
    ... 
  - accounting
    - get_item
    - list_sales
    - total_sales
    ... 

## Configuration
Is loaded from env variables
    - SHOPIFY_APP_CLIENT_ID="..."
    - SHOPIFY_APP_SECRET="shpss_..."
    - STORE_COUNTRY=IS
    - STORE_CURRENCY=ISK
    - STORE_LOCALE=is-IS

See .env.example