#!/usr/bin/env node

/**
 * Simple test script to verify Shopify API connection
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.SHOPIFY_APP_ENDPOINT;
const accessToken = process.env.SHOPIFY_APP_SECRET;

console.log('Testing Shopify API connection...');
console.log('Endpoint:', endpoint);
console.log('');

// Simple query to test connection
const query = `
  query {
    shop {
      name
      email
      currencyCode
    }
  }
`;

async function testConnection() {
  try {
    console.log('Sending GraphQL query...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query }),
    });

    console.log('Response status:', response.status);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ Connection successful!');
      console.log('Shop data:', JSON.stringify(data, null, 2));
    } else {
      console.log('\n❌ Connection failed!');
      console.log('Error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('\n❌ Connection error!');
    console.error('Error:', error.message);
  }
}

testConnection();
