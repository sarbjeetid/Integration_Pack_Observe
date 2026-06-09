# Endpoint Configuration Guide

## Overview

The Zscaler integration pack supports dynamic and flexible endpoint configuration, allowing you to connect to different ZPA and ZIA endpoints. This guide explains how the system resolves which endpoint to use for each request.

## Base URL Resolution Chain

The system uses a priority-based approach to determine which base URL to use:

### Priority Order (Highest to Lowest)

1. **Request-Level Override** (Highest Priority)
   - Most specific, applied only to that request
   - Three ways to specify:
     - Query parameter
     - HTTP header
     - Request body

2. **Environment Variables** (Medium Priority)
   - Service-specific environment variables
   - Set at application startup
   - Apply to all requests unless overridden

3. **Default Base URL** (Lowest Priority)
   - Falls back to `ZSCALER_BASE_URL`
   - Default: `https://api.zscloud.net`

## Configuration Methods

### 1. Environment Variables

Set these in your `.env` file or export as environment variables:

```bash
# Default base URL (used as fallback)
ZSCALER_BASE_URL=https://api.zscloud.net

# ZPA-specific endpoint (optional)
ZSCALER_ZPA_BASE_URL=https://zpa.zscloud.net

# ZIA-specific endpoint (optional)
ZSCALER_ZIA_BASE_URL=https://zia.zscloud.net
```

**When to use:** Application-wide configuration, multi-tenant setups with fixed endpoints

### 2. Query Parameters

Pass `baseUrl` as a query parameter:

```bash
# Override for a single request
GET /api/v1/zpa/applications?baseUrl=https://custom-zpa.company.com
GET /api/v1/zia/url-policies?baseUrl=https://custom-zia.company.com
```

**When to use:** One-off requests to different endpoints, testing, temporary overrides

### 3. HTTP Headers

Use the `X-Zscaler-Base-URL` header:

```bash
GET /api/v1/zpa/users
X-Zscaler-Base-URL: https://custom-zpa.company.com
```

**When to use:** Client libraries, standardized request patterns

### 4. Request Body

Include endpoint in the request body (POST/PUT):

```json
POST /api/v1/zpa/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "zpaBaseUrl": "https://custom-zpa.company.com"
}
```

**When to use:** Requests with body payload, when endpoint varies per record

## Examples

### Example 1: Multiple ZPA Tenants

**Environment Setup:**
```bash
ZSCALER_BASE_URL=https://api.zscloud.net
ZSCALER_ZPA_BASE_URL=https://zpa-primary.company.com
```

**Request to Primary ZPA:**
```bash
GET /api/v1/zpa/applications
# Uses: https://zpa-primary.company.com
```

**Request to Secondary ZPA:**
```bash
GET /api/v1/zpa/applications?baseUrl=https://zpa-secondary.company.com
# Uses: https://zpa-secondary.company.com
```

### Example 2: Separate ZPA and ZIA Endpoints

**Environment Setup:**
```bash
ZSCALER_BASE_URL=https://shared-api.company.com
ZSCALER_ZPA_BASE_URL=https://zpa-prod.company.com
ZSCALER_ZIA_BASE_URL=https://zia-prod.company.com
```

**ZPA Request:**
```bash
GET /api/v1/zpa/policies
# Uses: https://zpa-prod.company.com
```

**ZIA Request:**
```bash
GET /api/v1/zia/threat-reports
# Uses: https://zia-prod.company.com
```

### Example 3: Runtime Override

**Environment Setup:**
```bash
ZSCALER_BASE_URL=https://api.zscloud.net
# No service-specific URLs set
```

**Using Header Override:**
```bash
curl -X GET http://localhost:3000/api/v1/zpa/applications \
  -H "X-Zscaler-Base-URL: https://custom-endpoint.company.com"
# Uses: https://custom-endpoint.company.com
```

## Implementation Details

### Endpoint Resolver Utility

The system includes an `endpointResolver` utility in `src/utils/endpointResolver.ts` with these functions:

```typescript
// Resolve ZPA endpoint
resolveZPABaseUrl(explicitBaseUrl?: string): string

// Resolve ZIA endpoint  
resolveZIABaseUrl(explicitBaseUrl?: string): string

// Generic endpoint resolver
resolveBaseUrl(serviceType: 'zpa' | 'zia', explicitBaseUrl?: string): string

// Build complete URL
buildEndpointUrl(serviceType: 'zpa' | 'zia', path: string, baseUrl?: string): string
```

### URL Normalization

All URLs are automatically normalized:
- Trailing slashes are removed
- Empty strings are treated as undefined
- Invalid URLs will cause connection errors (handled by error handler)

## Best Practices

### 1. Use Environment Variables for Defaults
```bash
# .env (committed, with examples)
ZSCALER_ZPA_BASE_URL=
ZSCALER_ZIA_BASE_URL=

# .env.local (not committed, with actual values)
ZSCALER_ZPA_BASE_URL=https://zpa.company.com
ZSCALER_ZIA_BASE_URL=https://zia.company.com
```

### 2. Use Headers for Cross-Tenant Requests
```bash
# Client logic
const endpoint = tenantConfig.customZPAEndpoint;
headers['X-Zscaler-Base-URL'] = endpoint;
```

### 3. Document Custom Endpoints
```typescript
// In your API documentation or comments
// ZPA uses: https://zpa.company.com
// ZIA uses: https://zia.company.com
// Override with: X-Zscaler-Base-URL header or ?baseUrl query param
```

### 4. Validate Endpoints
```typescript
// Validate before using
if (!url.startsWith('https://')) {
    throw new Error('Only HTTPS endpoints are supported');
}
```

## Troubleshooting

### Connection Errors

If you get connection errors, check:

1. **URL Format**: Ensure URL is correct and uses HTTPS
   ```bash
   # Correct
   https://api.zscloud.net
   
   # Incorrect
   http://api.zscloud.net  # Missing 'https'
   api.zscloud.net         # Missing protocol
   ```

2. **Environment Variables**: Verify they're set correctly
   ```bash
   echo $ZSCALER_ZPA_BASE_URL
   ```

3. **Header Syntax**: Check header is spelled correctly
   ```bash
   X-Zscaler-Base-URL  # Correct
   x-zscaler-base-url  # Also works (case-insensitive)
   Zscaler-Base-URL    # Wrong
   ```

### Testing Endpoint Resolution

Use the health check endpoint:
```bash
GET /health
# Shows all resolved endpoints
```

## Environment Variable Reference

| Variable | Default | Purpose |
|---|---|---|
| `ZSCALER_BASE_URL` | `https://api.zscloud.net` | Fallback endpoint for both ZPA and ZIA |
| `ZSCALER_ZPA_BASE_URL` | `${ZSCALER_BASE_URL}` | ZPA-specific endpoint (optional) |
| `ZSCALER_ZIA_BASE_URL` | `${ZSCALER_BASE_URL}` | ZIA-specific endpoint (optional) |
| `ZSCALER_API_KEY` | `` | API authentication key (required) |
| `ZSCALER_AUTH_TYPE` | `api-key` | Authentication method |

## Advanced Configuration

### Multi-Region Setup

```bash
# Primary region
ZSCALER_ZPA_BASE_URL=https://zpa-us-east.company.com
ZSCALER_ZIA_BASE_URL=https://zia-us-east.company.com

# Secondary region (use query param at runtime)
# GET /api/v1/zpa/applications?baseUrl=https://zpa-eu-west.company.com
```

### Blue-Green Deployment

```bash
# Blue (current)
ZSCALER_ZPA_BASE_URL=https://zpa-blue.company.com

# Green (new, test with)
# GET /api/v1/zpa/applications?baseUrl=https://zpa-green.company.com
```

### Tenant Isolation

```bash
# Default tenant
ZSCALER_ZPA_BASE_URL=https://zpa-default.company.com

# Other tenants (use header or query param)
curl -H "X-Zscaler-Base-URL: https://zpa-tenant1.company.com" ...
curl "?baseUrl=https://zpa-tenant2.company.com" ...
```

## Summary

| Method | Priority | Scope | Best For |
|---|---|---|---|
| Request body | 1 (Highest) | Single request | Request-specific endpoints |
| Header | 2 | Single request | Client libraries |
| Query param | 3 | Single request | Testing, debugging |
| Env variable | 4 | All requests | Default configuration |
| Default | 5 (Lowest) | All requests | Fallback |

Choose the method that best fits your use case!
