/**
 * Shopify GraphQL query definitions for inventory and orders
 */

export interface ProductNode {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  createdAt: string;
  updatedAt: string;
  priceRangeV2: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
}

export interface OrderNode {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  subtotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer?: {
    displayName: string;
    email: string;
  };
}

/**
 * Get a single product by ID
 */
export const GET_PRODUCT = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      status
      totalInventory
      createdAt
      updatedAt
      priceRangeV2 {
        minVariantPrice {
          amount
          currencyCode
        }
        maxVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

/**
 * List products with pagination
 */
export const LIST_PRODUCTS = `
  query listProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id
          title
          handle
          status
          totalInventory
          createdAt
          updatedAt
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
            maxVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Get total count of products
 */
export const PRODUCTS_COUNT = `
  query productsCount($query: String) {
    productsCount(query: $query) {
      count
    }
  }
`;

/**
 * Get a single order by ID
 */
export const GET_ORDER = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      displayFinancialStatus
      displayFulfillmentStatus
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      customer {
        displayName
        email
      }
    }
  }
`;

/**
 * List orders with pagination
 */
export const LIST_ORDERS = `
  query listOrders($first: Int!, $after: String, $query: String) {
    orders(first: $first, after: $after, query: $query) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          subtotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            displayName
            email
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;
