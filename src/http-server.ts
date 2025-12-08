#!/usr/bin/env node

/**
 * MCP Shopify Server - HTTP/SSE transport
 * Entry point for HTTP server with Server-Sent Events support
 */

import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config/env.js';
import { createMCPServer } from './server/mcp-server.js';
import { logger, LogLevel } from './utils/logger.js';

async function main() {
  try {
    // Enable debug logging if DEBUG env var is set
    if (process.env.DEBUG) {
      logger.setLevel(LogLevel.DEBUG);
    }

    // Load configuration with CLI argument support
    const config = loadConfig();

    const port = parseInt(config.HTTP_PORT, 10);
    const host = config.HTTP_SERVER;

    logger.info('Starting MCP Shopify Server (HTTP/SSE transport)');
    logger.logConfig(
      {
        endpoint: config.SHOPIFY_APP_ENDPOINT,
        clientId: config.SHOPIFY_APP_CLIENT_ID,
        secret: config.SHOPIFY_APP_SECRET,
        country: config.STORE_COUNTRY,
        currency: config.STORE_CURRENCY,
        locale: config.STORE_LOCALE,
        httpPort: port,
        httpServer: host,
      },
      ['secret']
    );

    // Create Express app
    const app = express();

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        service: 'mcp-shopify',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });
    });

    // SSE endpoint for MCP
    app.get('/sse', async (req, res) => {
      logger.info('New SSE connection established');

      const transport = new SSEServerTransport('/message', res);
      const server = createMCPServer(config);

      await server.connect(transport);

      // Handle client disconnect
      req.on('close', () => {
        logger.info('SSE connection closed');
      });
    });

    // Message endpoint for SSE
    app.post('/message', async (_req, res) => {
      logger.debug('Received message on /message endpoint');
      // SSE transport handles this internally
      res.status(200).end();
    });

    // Error handling middleware
    app.use((err: any, _req: any, res: any, _next: any) => {
      logger.error('Express error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
      });
    });

    // Start server
    app.listen(port, host, () => {
      logger.info(`HTTP server listening on http://${host}:${port}`);
      logger.info(`SSE endpoint available at http://${host}:${port}/sse`);
      logger.info(`Health check at http://${host}:${port}/health`);
      logger.info('');
      logger.info('Test with MCP Inspector:');
      logger.info(`  npx @modelcontextprotocol/inspector http://${host}:${port}/sse`);
    });
  } catch (error) {
    logger.error('Failed to start HTTP server', error);
    process.exit(1);
  }
}

main();
