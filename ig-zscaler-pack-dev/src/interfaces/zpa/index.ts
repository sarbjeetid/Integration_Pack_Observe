// ZPA Interfaces

/**
 * Base response interface for paginated list responses
 */
export interface ZPAListResponse<T> {
  totalPages?: number;
  pageCount?: number;
  totalCount?: number;
  pageIndex?: number;
  list?: T[];
  data?: T[];
  [key: string]: any;
}

/**
 * Application
 */
export interface ZPAApplication {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  domain?: string;
  applicationProtocol?: string;
  appServerGroups?: Array<{ id: string; name: string }>;
  segmentGroupIds?: string[];
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Segment Group
 */
export interface ZPASegmentGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  policyMemberships?: string[];
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * App Connector
 */
export interface ZPAAppConnector {
  id?: string;
  name: string;
  enabled?: boolean;
  status?: string;
  version?: string;
  appConnectorGroupId?: string;
  createdTime?: number;
  modifiedTime?: number;
  lastModifiedBy?: string;
  [key: string]: any;
}

/**
 * App Connector Group
 */
export interface ZPAAppConnectorGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  connectorCount?: number;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Service Edge
 */
export interface ZPAServiceEdge {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  status?: string;
  version?: string;
  serviceEdgeGroupId?: string;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Service Edge Group
 */
export interface ZPAServiceEdgeGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  cityCountry?: string;
  countryCode?: string;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Server Group
 */
export interface ZPAServerGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  servers?: Array<{ id: string; name: string; address: string }>;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Policy Set
 */
export interface ZPAPolicySet {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  policyType?: string;
  ruleCount?: number;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Policy Rule
 */
export interface ZPAPolicyRule {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  action?: string;
  operator?: string;
  priority?: number;
  conditions?: any[];
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Provisioning Key
 */
export interface ZPAProvisioningKey {
  id?: string;
  associationType: string;
  associationId: string;
  key: string;
  enabled?: boolean;
  createdTime?: number;
  expirationTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Trusted Network
 */
export interface ZPATrustedNetwork {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  networkRanges?: string[];
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Posture Profile
 */
export interface ZPAPostureProfile {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Identity Provider
 */
export interface ZPAIDP {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  ssoType?: string;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * SCIM Attribute Header
 */
export interface ZPASCIMAttribute {
  id?: string;
  name: string;
  externalName?: string;
  dataType?: string;
  [key: string]: any;
}

/**
 * Browser Access App
 */
export interface ZPABrowserAccessApp {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  domain?: string;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Machine Group
 */
export interface ZPAMachineGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  machineCount?: number;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * User Group
 */
export interface ZPAUserGroup {
  id?: string;
  name: string;
  description?: string;
  enabled?: boolean;
  userCount?: number;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Certificate
 */
export interface ZPACertificate {
  id?: string;
  name: string;
  description?: string;
  certificatePem?: string;
  expirationDate?: number;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

/**
 * Customer Information
 */
export interface ZPACustomer {
  id?: string;
  name: string;
  email?: string;
  adminName?: string;
  adminEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  createdTime?: number;
  modifiedTime?: number;
  [key: string]: any;
}

// Legacy interfaces for compatibility
export interface ZPAUser {
  id: string;
  name: string;
  email: string;
  department?: string;
  comments?: string;
  groups?: string[];
}

export interface ZPAAccessPolicy {
  id: string;
  name: string;
  description?: string;
  action: 'ALLOW' | 'DENY';
  enabled: boolean;
  ruleOrder: number;
  conditions?: {
    appId?: string[];
    userId?: string[];
    groupId?: string[];
  };
}

export interface ZPAUserProvisioning {
  name: string;
  email: string;
  department?: string;
  groups?: string[];
  comments?: string;
}
