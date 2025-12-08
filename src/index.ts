#!/usr/bin/env node

/**
 * MCP Shopify Server - stdio transport
 * Entry point for command-line usage with Model Context Protocol
 */

import { loadConfig } from './config/env.js';
import { runStdioServer } from './server/mcp-server.js';
import { logger, LogLevel } from './utils/logger.js';

async function main() {
  try {
    // Enable debug logging if DEBUG env var is set
    if (process.env.DEBUG) {
      logger.setLevel(LogLevel.DEBUG);
    }

    // Load configuration
    const config = loadConfig();

    // Run the MCP server
    await runStdioServer(config);
  } catch (error) {
    logger.error('Failed to start MCP server', error);
    process.exit(1);
  }
}

main();
