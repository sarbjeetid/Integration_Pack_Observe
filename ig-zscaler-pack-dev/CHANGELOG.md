# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Zscaler Integration Pack
- Support for ZPA (Zscaler Private Access) API integration
  - List applications
  - Manage users
  - Create/Update/Delete access policies
- Support for ZIA (Zscaler Internet Access) API integration
  - URL category management
  - URL filtering policy management
  - Threat report retrieval
  - DLP incident tracking
  - Admin audit logging
  - Security reporting
- API key and OAuth2 authentication support
- Health check endpoint
- Comprehensive error handling
- OpenTelemetry integration for monitoring
- Winston logging with ECS format
- TypeScript support
- Jest testing framework
- Docker support

### Features
- RESTful API endpoints for ZPA operations
- RESTful API endpoints for ZIA operations
- Configurable API endpoints via environment variables
- Support for multiple authentication methods
- Request/response logging
- Error handling and reporting
- Dependency injection using TypeDI
- Redis caching support (optional)
