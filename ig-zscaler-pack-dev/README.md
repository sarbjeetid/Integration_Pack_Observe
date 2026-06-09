# ig-zscaler-pack

## Zscaler Integration

Zscaler is a leading Zero Trust Secure Access Service Edge (SSE) platform that provides cloud-native security services. This integration pack connects to both ZPA (Zscaler Private Access) and ZIA (Zscaler Internet Access) portals.

### Dynamic Endpoint Configuration

The integration pack supports flexible endpoint configuration for both ZPA and ZIA, allowing you to use different base URLs for each service. This is useful when:
- ZPA and ZIA are hosted on different endpoints
- You have multiple Zscaler tenants
- Your organization uses custom Zscaler deployments

**Base URL Resolution Priority:**

1. **Request-level override** (highest priority):
   - Query parameter: `?baseUrl=https://custom-endpoint.com`
   - Request header: `X-Zscaler-Base-URL: https://custom-endpoint.com`
   - Request body: `{ "zpaBaseUrl": "..." }` or `{ "ziaBaseUrl": "..." }`

2. **Environment variable** (service-specific):
   - `ZSCALER_ZPA_BASE_URL` for ZPA endpoints
   - `ZSCALER_ZIA_BASE_URL` for ZIA endpoints

3. **Fallback** (default):
   - `ZSCALER_BASE_URL` (default: `https://api.zscloud.net`)



### API Capabilities

#### ZPA Operations
- **List Applications**: Retrieve all configured applications
- **List Users**: Get user information and status
- **List Access Policies**: Retrieve security policies
- **Create/Update Policies**: Manage access control policies
- **User Provisioning**: Add or modify users in ZPA

#### ZIA Operations
- **URL Filtering**: Manage URL categories and policies
- **Threat Protection**: Configure threat prevention settings
- **DLP Policies**: Create and manage data loss prevention rules
- **Admin Audit Logs**: Retrieve system audit logs
- **Security Reports**: Get security incident reports

## User Stories

- As an admin, I should be able to list ZPA applications
- As an admin, I should be able to manage ZPA access policies
- As an admin, I should be able to configure ZIA URL filtering policies
- As an admin, I should be able to retrieve security reports from ZIA
- As an admin, I should be able to manage user access in ZPA

## Technical Specifications

### Repository

[ig-zscaler-pack](https://gitlab.com/intelligeni-core/ig-zscaler-pack)

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Authentication**: Zscaler API Key & OAuth2
- **Service Architecture**: Microservices with dependency injection (TypeDI)
- **Logging**: Winston with OpenTelemetry integration
- **Caching**: Redis
- **API Client**: Axios

### API List

| **API**                      | **Description**                                  |
| ---------------------------- | ------------------------------------------------ |
| ZPA: List Applications       | Retrieve all applications in ZPA                 |
| ZPA: List Users              | Get all users from ZPA                           |
| ZPA: List Policies           | Retrieve access policies from ZPA                |
| ZPA: Create Policy           | Create new access policy in ZPA                  |
| ZPA: Update Policy           | Update existing access policy in ZPA             |
| ZIA: List URL Categories     | Retrieve URL filtering categories                |
| ZIA: Create URL Policy       | Create URL filtering policy in ZIA               |
| ZIA: Get Threat Report       | Retrieve threat incidents from ZIA               |
| ZIA: Get DLP Incidents       | Get data loss prevention incidents               |
| Health Check                 | Verify API connectivity                          |

### Environment Variables

```
# API Configuration
ZSCALER_API_KEY=<your_api_key>
ZSCALER_BASE_URL=https://api.zscloud.net

# Optional: Use different endpoints for ZPA and ZIA
ZSCALER_ZPA_BASE_URL=https://zpa.zscloud.net
ZSCALER_ZIA_BASE_URL=https://zia.zscloud.net

ZSCALER_CLIENT_ID=<client_id>
ZSCALER_CLIENT_SECRET=<client_secret>

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Dapr
DAPR_HOST=localhost
DAPR_HTTP_PORT=3500
```

### Using Custom Base URLs

You can override the base URL at request level:

**Using Query Parameter:**
```bash
GET /api/v1/zpa/applications?baseUrl=https://custom-zpa.company.com
```

**Using Request Header:**
```bash
GET /api/v1/zia/url-policies
X-Zscaler-Base-URL: https://custom-zia.company.com
```

**Using Request Body (POST/PUT):**
```json
POST /api/v1/zpa/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "zpaBaseUrl": "https://custom-zpa.company.com"
}
```


## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start

```bash
npm start
```

## Testing

```bash
npm test
npm run test:coverage
```

## Project Structure

```
ig-zscaler-pack-dev/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/      # Express controllers
│   ├── services/
│   │   ├── zpa/         # ZPA service implementations
│   │   ├── zia/         # ZIA service implementations
│   │   └── authentication/ # Auth service
│   ├── interfaces/       # TypeScript interfaces
│   ├── loaders/         # Dependency initialization
│   ├── routes/          # Express routes
│   ├── utils/           # Utility functions
│   ├── server.ts        # Main server file
│   └── otel.ts          # OpenTelemetry config
├── tests/               # Test files
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

Please follow the project's coding standards and include tests for new features.
