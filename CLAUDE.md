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

## Technical stack
    - Typescript

## Configuration
Is loaded from env variables
    - SHOPIFY_APP_CLIENT_ID="..."
    - SHOPIFY_APP_SECRET="shpss_..."
    - STORE_COUNTRY=IS
    - STORE_CURRENCY=ISK
    - STORE_LOCALE=is-IS
    - HTTP_PORT=3022
    - HTTP_SERVER=localhost

See .env.example


## Development and tests

When testing we should have 1-3 second timeout randomly to not overwhelm the api. We wrap the main API with cache-wrapper.ts
