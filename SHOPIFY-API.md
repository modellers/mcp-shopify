# Shopify API Documentation

## Overview

Shopify provides multiple API types for different use cases. As of April 1, 2025, all new public apps must use the GraphQL Admin API exclusively.

## API Types

### 1. GraphQL Admin API (Recommended)
- **Endpoint**: `https://{store}.myshopify.com/admin/api/2025-10/graphql.json`
- **Method**: POST requests only
- **Status**: Primary API for all new development
- **Advantages**:
  - Single endpoint for all operations
  - Doubled rate limits compared to REST
  - 75% lower query costs for connections
  - Exclusive features (2,000 product variants, Metaobjects)
  - Fetch related data in a single request
  - Request only the fields you need

### 2. REST Admin API (Legacy)
- **Endpoint Pattern**: `https://{store}.myshopify.com/admin/api/2025-10/{resource}.json`
- **Status**: Legacy as of October 1, 2024
- **Rate Limit**: 40 requests per app per store per minute
- **Supports**: Standard CRUD operations (GET, POST, PUT, DELETE)

### 3. Storefront API
- **Endpoint**: `https://{store}.myshopify.com/api/2025-10/graphql.json`
- **Purpose**: Customer-facing operations
- **Method**: POST requests to single GraphQL endpoint

### 4. Other APIs
- **Customer Account API**: Customer authentication and account management
- **Marketing Activities API**: Marketing integration endpoints
- **Shopify Functions API**: Custom backend logic

## Main Resource Categories

The Shopify Admin API provides access to 20 main resource categories:

1. **Access** - App access control and permissions
2. **Billing** - Application charges and subscriptions
3. **Customers** - Customer profile and data management
4. **Discounts** - Pricing rules and promotional codes
5. **Events** - Activity and event tracking
6. **Gift Cards** - Gift card creation and management
7. **Inventory** - Stock levels and inventory locations
8. **Marketing Event** - Marketing campaign management
9. **Metafield** - Custom data fields for extensibility
10. **Mobile Support** - Mobile app-specific features
11. **Online Store** - Storefront pages and content
12. **Orders** - Purchase records and transaction details
13. **Plus** - Shopify Plus enterprise features
14. **Products** - Product catalog and variants
15. **Sales Channels** - Multi-channel selling capabilities
16. **Shipping and Fulfillment** - Order fulfillment workflows
17. **Shopify Payments** - Payment processing
18. **Store Properties** - Shop settings and configuration
19. **Tender Transaction** - Payment method transactions
20. **Webhooks** - Real-time event notifications

## Key Capabilities

### Core Operations
- **CRUD Operations**: Full Create, Read, Update, Delete support
- **Batch Operations**: Process multiple items efficiently
- **Cursor-based Pagination**: Navigate large datasets
- **Filtering & Sorting**: Query specific data subsets

### Advanced Features
- **Fulfillment Orders API**: Complex multi-location fulfillment
- **Multi-location Inventory**: Track stock across warehouses
- **Metafields**: Store custom data on any resource
- **Webhooks**: Subscribe to real-time events
- **Bulk Operations**: Process large datasets asynchronously

### GraphQL-Specific
- **Nested Queries**: Fetch related data in one request
- **Field Selection**: Request only needed fields
- **Mutations**: Create and modify data
- **Query Cost System**: Rate limiting based on complexity

## Authentication

All APIs require:
- Access tokens obtained during app installation
- Specific access scopes for different resource types
- Proper authorization headers in requests

## Rate Limiting

### GraphQL Admin API
- Based on calculated query costs (points system)
- Each field costs a set number of points
- Maximum cost per query enforced
- Significantly higher throughput than REST

### REST Admin API
- 40 requests per app per store per minute
- Replenishes at 2 requests per second
- Bucket-based rate limiting

## Versioning

- APIs are versioned quarterly (4 releases per year)
- Version format: `YYYY-MM` (e.g., 2025-10)
- Always specify version in endpoint URL for stability
- Check release notes for breaking changes

## Official Documentation

- **Main API Hub**: https://shopify.dev/docs/api
- **GraphQL Admin API**: https://shopify.dev/docs/api/admin-graphql
- **REST Admin API**: https://shopify.dev/docs/api/admin-rest
- **Storefront API**: https://shopify.dev/docs/api/storefront
- **Release Notes**: https://shopify.dev/docs/api/release-notes

## Migration Notes

- REST API marked as legacy October 1, 2024
- New public apps must use GraphQL after April 1, 2025
- Existing REST apps continue to work but should plan migration
- GraphQL is a superset of REST functionality
- New features may only be available in GraphQL