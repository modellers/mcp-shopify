#!/usr/bin/env node

/**
 * Test Shopify client with client credentials grant
 */

import { loadConfig } from './src/config/env.js';
import { ShopifyClient } from './src/shopify/client.js';
import { logger, LogLevel } from './src/utils/logger.js';

logger.setLevel(LogLevel.DEBUG);

async function test() {
  try {
    logger.info('Loading configuration...');
    const config = loadConfig();

    logger.info('Creating Shopify client...');
    const client = new ShopifyClient(config);

    logger.info('Testing shop query...');
    const result = await client.query(`
      query {
        shop {
          name
          email
          currencyCode
        }
      }
    `);

    logger.info('✅ Success!');
    console.log('\nShop data:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    logger.error('❌ Test failed', error);
    process.exit(1);
  }
}

test();
