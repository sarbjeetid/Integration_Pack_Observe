# Zscaler App Connector API Documentation

## Overview

The Zscaler Integration Pack provides comprehensive endpoints for managing ZPA (Zscaler Private Access) App Connectors across multiple Zscaler cloud zones. This document describes the connector management API endpoints and configuration options.

## Table of Contents

1. [Cloud Zones](#cloud-zones)
2. [Authentication](#authentication)
3. [Base URL Resolution](#base-url-resolution)
4. [Connector Endpoints](#connector-endpoints)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Handling](#error-handling)

## Cloud Zones

Zscaler operates multiple cloud zones globally. The integration pack supports targeting any of these zones:

| Zone Key | Endpoint | Description |
|----------|----------|-------------|
| `us` | `https://config.zscloud.net` | US (Default) |
| `private-us` | `https://config.private.zscaler.com` | Private US Cloud |
| `private-uszl` | `https://config.private.uszl.zscaler.com` | Private US ZL |
| `europe` | `https://config.eu.zscaler.com` | Europe |
| `private-eu` | `https://config.private.eu.zscaler.com` | Private Europe |
| `apac` | `https://config.apac.zscaler.com` | Asia-Pacific |
| `private-apac` | `https://config.private.apac.zscaler.com` | Private APAC |

### Setting Cloud Zone

**Option 1: Environment Variable**
```bash
# Default zone is 'us' if not specified
ZSCALER_CLOUD_ZONE=private-us
```

**Option 2: Query Parameter**
```bash
GET /api/v1/connectors/list?baseUrl=https://config.private.zscaler.com
```

**Option 3: HTTP Header**
```bash
GET /api/v1/connectors/list
X-Zscaler-Base-URL: https://config.private.zscaler.com
```

## Authentication

### OAuth2 Authentication (Recommended for Connector Management)

The connector endpoints use OAuth2 authentication with form-urlencoded token requests:

```bash
POST https://config.zscloud.net/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=your_client_id&client_secret=your_client_secret&grant_type=client_credentials
```

**Environment Setup:**
```bash
ZSCALER_AUTH_TYPE=oauth2
ZSCALER_CLIENT_ID=your_client_id
ZSCALER_CLIENT_SECRET=your_client_secret
```

### API Key Authentication

Alternatively, API key authentication is supported:

```bash
ZSCALER_AUTH_TYPE=api-key
ZSCALER_API_KEY=your_api_key
```

## Base URL Resolution

The system uses a priority chain to determine the endpoint:

1. **Request-level overrides** (highest priority)
   - Query parameter: `?baseUrl=...`
   - HTTP header: `X-Zscaler-Base-URL: ...`
   - Request body: `{ "baseUrl": "..." }`

2. **Customer ID** (for multi-tenant APIs)
   - Query parameter: `?customerId=...`
   - HTTP header: `X-Zscaler-Customer-ID: ...`
   - Request body: `{ "customerId": "..." }`

3. **Environment configuration** (medium priority)
   - `ZSCALER_ZPA_BASE_URL` or `ZSCALER_BASE_URL`
   - `ZSCALER_CLOUD_ZONE`

4. **Default** (lowest priority)
   - US cloud zone: `https://config.zscloud.net`

## Connector Endpoints

### List All Connectors

Get paginated list of all connectors.

```http
GET /api/v1/connectors/list?page=1&pageSize=100
```

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `pageSize` (optional, default: 100) - Results per page
- `customerId` (optional) - Customer ID for multi-tenant APIs
- `baseUrl` (optional) - Override base URL

**Response:**
```json
{
  "totalPages": 5,
  "pageCount": 5,
  "totalCount": 456,
  "pageIndex": 1,
  "list": [
    {
      "id": "connector_123",
      "name": "Branch Office Connector",
      "enabled": true,
      "status": "online",
      "version": "21.147.0",
      "appConnectorGroupId": "group_456",
      "createdTime": 1634567890000,
      "modifiedTime": 1634567890000,
      "lastModifiedBy": "admin@company.com"
    }
  ]
}
```

### Fetch All Connectors

Get all connectors (automatically handles pagination).

```http
GET /api/v1/connectors/all
```

**Query Parameters:**
- `customerId` (optional) - Customer ID for multi-tenant APIs
- `baseUrl` (optional) - Override base URL

**Response:**
```json
{
  "totalCount": 456,
  "list": [
    { ... },
    { ... }
  ]
}
```

### Get Connector by ID

Retrieve details of a specific connector.

```http
GET /api/v1/connectors/{connectorId}
```

**Path Parameters:**
- `connectorId` (required) - The connector ID

**Response:**
```json
{
  "id": "connector_123",
  "name": "Branch Office Connector",
  "enabled": true,
  "status": "online",
  "version": "21.147.0",
  "appConnectorGroupId": "group_456",
  "createdTime": 1634567890000,
  "modifiedTime": 1634567890000,
  "lastModifiedBy": "admin@company.com"
}
```

### Get Connectors by Group ID

List all connectors in a specific connector group.

```http
GET /api/v1/connectors/group/{groupId}
```

**Path Parameters:**
- `groupId` (required) - The connector group ID

**Response:**
```json
{
  "totalCount": 12,
  "list": [
    { ... },
    { ... }
  ]
}
```

### Create Connector

Create a new app connector.

```http
POST /api/v1/connectors
```

**Request Body:**
```json
{
  "connector": {
    "name": "New Branch Connector",
    "enabled": true,
    "appConnectorGroupId": "group_456"
  }
}
```

**Response:**
```json
{
  "id": "connector_789",
  "name": "New Branch Connector",
  "enabled": true,
  "appConnectorGroupId": "group_456"
}
```

**Status Code:** `201 Created`

### Update Connector

Update an existing connector.

```http
PUT /api/v1/connectors/{connectorId}
```

**Path Parameters:**
- `connectorId` (required) - The connector ID

**Request Body:**
```json
{
  "connector": {
    "name": "Updated Connector Name",
    "enabled": false
  }
}
```

**Response:**
```json
{
  "id": "connector_123",
  "name": "Updated Connector Name",
  "enabled": false
}
```

### Delete Connector

Delete a connector.

```http
DELETE /api/v1/connectors/{connectorId}
```

**Path Parameters:**
- `connectorId` (required) - The connector ID

**Response:**
```json
{
  "message": "Connector deleted successfully"
}
```

### Get Connector Status

Get health/status information for a specific connector.

```http
GET /api/v1/connectors/{connectorId}/status
```

**Path Parameters:**
- `connectorId` (required) - The connector ID

**Response:**
```json
{
  "id": "connector_123",
  "status": "online",
  "lastHeartbeat": 1634567890000,
  "version": "21.147.0",
  "location": "Branch Office",
  "ipAddress": "192.168.1.100"
}
```

### Get Bulk Connector Status

Get status for multiple connectors at once.

```http
POST /api/v1/connectors/status/bulk
```

**Request Body:**
```json
{
  "connectorIds": [
    "connector_123",
    "connector_456",
    "connector_789"
  ]
}
```

**Response:**
```json
{
  "totalCount": 3,
  "list": [
    {
      "id": "connector_123",
      "status": "online",
      "lastHeartbeat": 1634567890000
    },
    {
      "id": "connector_456",
      "status": "offline",
      "lastHeartbeat": 1634567700000
    },
    {
      "id": "connector_789",
      "status": "online",
      "lastHeartbeat": 1634567890000
    }
  ]
}
```

### Get Available Zones

List all available Zscaler cloud zones.

```http
GET /api/v1/connectors/zones
```

**Response:**
```json
{
  "totalCount": 7,
  "list": [
    { "zone": "us", "url": "https://config.zscloud.net" },
    { "zone": "private-us", "url": "https://config.private.zscaler.com" },
    { "zone": "private-uszl", "url": "https://config.private.uszl.zscaler.com" },
    { "zone": "europe", "url": "https://config.eu.zscaler.com" },
    { "zone": "private-eu", "url": "https://config.private.eu.zscaler.com" },
    { "zone": "apac", "url": "https://config.apac.zscaler.com" },
    { "zone": "private-apac", "url": "https://config.private.apac.zscaler.com" }
  ]
}
```

## Request/Response Examples

### Example 1: List Connectors in Private US Cloud

```bash
curl -X GET "http://localhost:3000/api/v1/connectors/list?page=1&pageSize=50" \
  -H "Authorization: Bearer YOUR_OAUTH2_TOKEN" \
  -H "X-Zscaler-Base-URL: https://config.private.zscaler.com" \
  -H "Content-Type: application/json"
```

### Example 2: Get Connector Status with Customer ID

```bash
curl -X GET "http://localhost:3000/api/v1/connectors/connector_123/status" \
  -H "Authorization: Bearer YOUR_OAUTH2_TOKEN" \
  -H "X-Zscaler-Customer-ID: cust_456" \
  -H "X-Zscaler-Base-URL: https://config.private.zscaler.com" \
  -H "Content-Type: application/json"
```

### Example 3: Create Connector with Explicit Base URL

```bash
curl -X POST "http://localhost:3000/api/v1/connectors" \
  -H "Authorization: Bearer YOUR_OAUTH2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector": {
      "name": "Remote Office Connector",
      "enabled": true,
      "appConnectorGroupId": "group_789"
    },
    "baseUrl": "https://config.private.zscaler.com"
  }'
```

### Example 4: Bulk Status Check

```bash
curl -X POST "http://localhost:3000/api/v1/connectors/status/bulk" \
  -H "Authorization: Bearer YOUR_OAUTH2_TOKEN" \
  -H "X-Zscaler-Base-URL: https://config.eu.zscaler.com" \
  -H "Content-Type: application/json" \
  -d '{
    "connectorIds": [
      "connector_111",
      "connector_222",
      "connector_333"
    ]
  }'
```

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "statusCode": 401,
  "message": "Unauthorized - Invalid credentials or expired token",
  "error": "[getConnectorById] Unauthorized - Invalid credentials or expired token"
}
```

### Common HTTP Status Codes

| Status | Description | Cause |
|--------|-------------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Connector created successfully |
| 400 | Bad Request | Missing/invalid parameters |
| 401 | Unauthorized | Invalid credentials or expired token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Connector/endpoint doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

### Example Error Response

```json
{
  "statusCode": 404,
  "message": "Not found - Connector or endpoint does not exist",
  "error": "[getConnectorById] Not found - Connector or endpoint does not exist"
}
```

## Configuration Examples

### Multi-Zone Setup

**.env Configuration:**
```bash
# Primary zone (US)
ZSCALER_CLOUD_ZONE=us
ZSCALER_CLIENT_ID=your_us_client_id
ZSCALER_CLIENT_SECRET=your_us_client_secret

# Fallback to private cloud if specified in request
ZSCALER_AUTH_TYPE=oauth2
```

**Runtime Override:**
```bash
# Switch to Europe zone
curl -X GET "http://localhost:3000/api/v1/connectors/list" \
  -H "X-Zscaler-Base-URL: https://config.eu.zscaler.com"

# Switch to Private US
curl -X GET "http://localhost:3000/api/v1/connectors/list" \
  -H "X-Zscaler-Base-URL: https://config.private.zscaler.com"
```

### Token Caching

Tokens are automatically cached for 55 minutes to reduce API calls:

```typescript
// Manual token management
import { getOAuth2Token, clearTokenCache } from './services/authentication/authService';

// Get token (cached if available)
const token = await getOAuth2Token('https://config.private.zscaler.com');

// Clear cache if needed
clearTokenCache('https://config.private.zscaler.com');
```

## Testing

### Health Check Endpoint

```bash
# Check service availability
curl -X GET "http://localhost:3000/health"
```

### Available Zones Endpoint

```bash
# List all supported zones
curl -X GET "http://localhost:3000/api/v1/connectors/zones" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

1. **Use OAuth2 for Connector Management**
   - More secure than API keys
   - Token caching reduces API calls
   - Supports modern security standards

2. **Implement Retry Logic**
   - Handle rate limiting (429 status)
   - Retry with exponential backoff

3. **Cache Results Locally**
   - Connector lists don't change frequently
   - Reduce API calls by caching

4. **Specify Zone Explicitly**
   - Always use base URL header or query parameter
   - Avoids configuration mismatches

5. **Monitor Token Expiry**
   - Use the provided token caching
   - Clear cache on authentication errors

## Troubleshooting

### "Invalid credentials or expired token"

- Verify `ZSCALER_CLIENT_ID` and `ZSCALER_CLIENT_SECRET`
- Check token hasn't expired (current implementation caches for 55 minutes)
- Ensure base URL is correct for your zone

### "Rate limit exceeded"

- Implement retry logic with exponential backoff
- Reduce request frequency
- Batch operations when possible (use bulk status endpoint)

### "Not found - Connector does not exist"

- Verify connector ID is correct
- Ensure you're connecting to correct cloud zone
- Check customer ID if using multi-tenant API

### "Insufficient permissions"

- Verify API credentials have connector management permissions
- Check OAuth2 scope grants
- Confirm customer ID authorization
