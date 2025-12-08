import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { EnvConfig } from '../config/env.js';

export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: Record<string, any>;
  }>;
}

export class ShopifyClient {
  private endpoint: string;
  private accessToken: string;

  constructor(config: EnvConfig) {
    this.endpoint = config.SHOPIFY_APP_ENDPOINT;
    this.accessToken = config.SHOPIFY_APP_SECRET;
  }

  /**
   * Execute a GraphQL query against Shopify Admin API
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();

    logger.debug('Executing GraphQL query', { query, variables });

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const duration = Date.now() - startTime;
      logger.logResponse(response.status, this.endpoint, duration);

      if (!response.ok) {
        await this.handleHTTPError(response);
      }

      const result: GraphQLResponse<T> = await response.json();

      // Check for GraphQL errors
      if (result.errors && result.errors.length > 0) {
        this.handleGraphQLErrors(result.errors);
      }

      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      logger.debug('Query successful', { duration });
      return result.data;
    } catch (error) {
      logger.error('GraphQL query failed', error);
      throw error;
    }
  }

  /**
   * Handle HTTP errors with detailed explanations
   */
  private async handleHTTPError(response: any): Promise<never> {
    const statusCode = response.status;
    let errorMessage = `HTTP ${statusCode}`;
    let errorDetails: any = {};

    try {
      const body = await response.text();
      errorDetails.responseBody = body;

      // Try to parse as JSON for more details
      try {
        const json = JSON.parse(body);
        errorDetails.parsedError = json;
      } catch {
        // Body is not JSON
      }
    } catch {
      // Couldn't read body
    }

    switch (statusCode) {
      case 401:
        errorMessage = 'Authentication failed - Invalid or missing access token';
        errorDetails.resolution = 'Check SHOPIFY_APP_SECRET environment variable';
        break;
      case 403:
        errorMessage = 'Forbidden - Valid authentication but insufficient permissions';
        errorDetails.resolution = 'Verify API access scopes in Shopify app settings';
        break;
      case 404:
        errorMessage = 'Not Found - API endpoint does not exist';
        errorDetails.resolution = 'Check SHOPIFY_APP_ENDPOINT configuration';
        break;
      case 422:
        errorMessage = 'Unprocessable Entity - Validation error in request';
        errorDetails.resolution = 'Review GraphQL query syntax and variables';
        break;
      case 429:
        errorMessage = 'Too Many Requests - Rate limit exceeded';
        errorDetails.resolution = 'Reduce request frequency or implement backoff';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = `Server Error (${statusCode}) - Shopify API is experiencing issues`;
        errorDetails.resolution = 'Retry the request after a delay';
        break;
      default:
        errorMessage = `Unexpected HTTP error ${statusCode}`;
    }

    const error = new Error(errorMessage);
    (error as any).statusCode = statusCode;
    (error as any).details = errorDetails;

    throw error;
  }

  /**
   * Handle GraphQL-specific errors
   */
  private handleGraphQLErrors(errors: GraphQLResponse['errors']): never {
    const formattedErrors = errors!.map(err => ({
      message: err.message,
      path: err.path?.join('.'),
      locations: err.locations,
      extensions: err.extensions,
    }));

    logger.error('GraphQL validation errors', formattedErrors);

    const errorMessage = errors!.map(e => e.message).join('; ');
    const error = new Error(`GraphQL Error: ${errorMessage}`);
    (error as any).graphqlErrors = formattedErrors;

    throw error;
  }
}
