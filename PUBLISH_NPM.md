# Publishing to NPM

## Publishing to @taskingagency Organization

### Prerequisites

1. **NPM Account Setup**
   - Create account at https://www.npmjs.com/signup
   - Verify your email address

2. **Join Organization**
   - Organization owner must invite you to `@taskingagency`
   - Accept invitation via email or npm website

3. **Login to NPM**
   ```bash
   npm login
   ```
   - Enter your username, password, and email
   - Complete 2FA if enabled

### Update package.json

Change the package name to include the organization scope:

```json
{
  "name": "@taskingagency/mcp-shopify",
  "version": "1.0.0",
  ...
}
```

### Publishing Process

1. **Build the package**
   ```bash
   npm run build
   ```

2. **Test the package contents**
   ```bash
   npm pack --dry-run
   ```
   This shows what files will be included (should only show `dist/`, `package.json`, `README.md`, `LICENSE`)

3. **Publish to organization**
   ```bash
   npm publish --access public
   ```

   Note: `--access public` is required for scoped packages to be publicly available

### Version Updates

Follow semantic versioning (semver):

- **Patch** (bug fixes): `npm version patch` → 1.0.0 → 1.0.1
- **Minor** (new features): `npm version minor` → 1.0.0 → 1.1.0
- **Major** (breaking changes): `npm version major` → 1.0.0 → 2.0.0

Then publish:
```bash
npm version patch
npm publish --access public
```

### Installation

Users can install with:
```bash
npm install @taskingagency/mcp-shopify
```

### Unpublish (Emergency Only)

You can only unpublish within 72 hours:
```bash
npm unpublish @taskingagency/mcp-shopify@1.0.0
```

**Warning:** Unpublishing is discouraged. Use deprecation instead:
```bash
npm deprecate @taskingagency/mcp-shopify@1.0.0 "Please upgrade to 1.0.1"
```

## Verification

After publishing, verify at:
- https://www.npmjs.com/package/@taskingagency/mcp-shopify
