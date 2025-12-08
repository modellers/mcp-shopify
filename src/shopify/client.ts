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

interface TokenResponse {
  access_token: string;
  scope: string;
  expires_in: number;
}

export class ShopifyClient {
  private endpoint: string;
  private accessToken: string;
  private clientId: string;
  private clientSecret: string;
  private shopDomain: string;
  private tokenExpiry: number = 0;
  private useClientCredentials: boolean;

  constructor(config: EnvConfig) {
    this.endpoint = config.SHOPIFY_APP_ENDPOINT;
    this.clientId = config.SHOPIFY_APP_CLIENT_ID;
    this.clientSecret = config.SHOPIFY_APP_SECRET;

    // Extract shop domain from endpoint
    const match = config.SHOPIFY_APP_ENDPOINT.match(/https:\/\/([^\/]+)\//);
    this.shopDomain = match ? match[1] : '';

    // Check if using client credentials (secret starts with shpss_ or shpcs_)
    // vs access token (starts with shpat_ or shpca_)
    this.useClientCredentials = config.SHOPIFY_APP_SECRET.startsWith('shpss_') ||
                                 config.SHOPIFY_APP_SECRET.startsWith('shpcs_');

    if (this.useClientCredentials) {
      logger.info('Using client credentials grant flow (tokens expire every 24h)');
      this.accessToken = ''; // Will be fetched on first request
    } else {
      logger.info('Using static access token');
      this.accessToken = config.SHOPIFY_APP_SECRET;
    }
  }

  /**
   * Exchange client credentials for access token
   */
  private async fetchAccessToken(): Promise<void> {
    const tokenUrl = `https://${this.shopDomain}/admin/oauth/access_token`;

    logger.info('Fetching new access token using client credentials...');

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Token exchange failed (${response.status}): ${body}`);
      }

      const tokenData: TokenResponse = await response.json();
      this.accessToken = tokenData.access_token;

      // Set expiry with 5 minute buffer (24h - 5min)
      this.tokenExpiry = Date.now() + ((tokenData.expires_in - 300) * 1000);

      logger.info(`Access token obtained, expires in ${tokenData.expires_in}s (${Math.floor(tokenData.expires_in / 3600)}h)`);
      logger.debug(`Token scopes: ${tokenData.scope}`);
    } catch (error) {
      logger.error('Failed to obtain access token', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.useClientCredentials) {
      return; // Using static token, no refresh needed
    }

    const now = Date.now();
    if (!this.accessToken || now >= this.tokenExpiry) {
      await this.fetchAccessToken();
    }
  }

  /**
   * Execute a GraphQL query against Shopify Admin API
   */
  async query<T = any>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    // Ensure we have a valid access token
    await this.ensureValidToken();

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
