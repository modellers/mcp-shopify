#!/usr/bin/env node

/**
 * OAuth flow to generate a Shopify Admin API access token.
 *
 * 1. Opens browser for authorization
 * 2. Captures the callback with the auth code
 * 3. Exchanges code for an access token (shpat_...)
 */

import * as dotenv from 'dotenv';
import http from 'http';
import { execSync } from 'child_process';

dotenv.config();

const clientId = process.env.SHOPIFY_APP_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_APP_ACCESS_TOKEN;
const endpoint = process.env.SHOPIFY_APP_ENDPOINT;

// Extract store domain from endpoint
const storeMatch = endpoint.match(/https:\/\/([^/]+)/);
const storeDomain = storeMatch ? storeMatch[1] : null;

if (!clientId || !clientSecret || !storeDomain) {
  console.error('Missing SHOPIFY_APP_CLIENT_ID, SHOPIFY_APP_ACCESS_TOKEN, or SHOPIFY_APP_ENDPOINT in .env');
  process.exit(1);
}

const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = 'read_products,read_orders,read_inventory,read_customers';

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');

    if (!code) {
      res.writeHead(400);
      res.end('Missing authorization code');
      return;
    }

    console.log('\nReceived authorization code, exchanging for access token...');

    try {
      const tokenRes = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        }),
      });

      const data = await tokenRes.json();

      if (data.access_token) {
        console.log('\n✅ Access token generated successfully!');
        console.log(`\nToken: ${data.access_token}`);
        console.log(`\nUpdate your .env file:`);
        console.log(`SHOPIFY_APP_ACCESS_TOKEN="${data.access_token}"`);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Success!</h1><p>Access token generated. Check your terminal.</p><p>You can close this tab.</p>');
      } else {
        console.log('\n❌ Failed to get access token:', JSON.stringify(data, null, 2));
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
      }
    } catch (err) {
      console.error('\n❌ Error exchanging code:', err.message);
      res.writeHead(500);
      res.end('Error exchanging code');
    }

    setTimeout(() => { server.close(); process.exit(0); }, 1000);
  }
});

server.listen(PORT, () => {
  const authUrl = `https://${storeDomain}/admin/oauth/authorize?client_id=${clientId}&scope=${SCOPES}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  console.log('Starting Shopify OAuth flow...');
  console.log(`\nStore: ${storeDomain}`);
  console.log(`Scopes: ${SCOPES}`);
  console.log(`\nOpening browser...\n`);
  console.log(`If browser doesn't open, visit:\n${authUrl}\n`);

  // Open browser (macOS)
  try {
    execSync(`open "${authUrl}"`);
  } catch {
    console.log('Could not open browser automatically.');
  }
});
