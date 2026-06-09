// ZIA Interfaces
export interface ZIAURLCategory {
  id: string;
  name: string;
  description?: string;
  category: string;
  keywords?: string[];
  urls?: string[];
  dbCategorizedUrls?: string[];
}

export interface ZIAURLPolicy {
  id: string;
  name: string;
  description?: string;
  action: 'ALLOW' | 'BLOCK' | 'CAUTION';
  urlCategories: string[];
  users?: string[];
  groups?: string[];
  departments?: string[];
  enabled: boolean;
  order: number;
}

export interface ZIAThreatReport {
  id: string;
  timestamp: number;
  threatName: string;
  threatCategory: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sourceIp: string;
  destIp?: string;
  sourceUser?: string;
  action: string;
  count: number;
}

export interface ZIADLPIncident {
  id: string;
  timestamp: number;
  incidentType: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  user: string;
  sourceIp: string;
  fileName?: string;
  fileType?: string;
  action: string;
}

export interface ZIAAdminAuditLog {
  id: string;
  timestamp: number;
  adminName: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILURE';
  details: string;
}

export interface ZIASecurityReport {
  timestamp: number;
  threatCount: number;
  dlpCount: number;
  urlBlockCount: number;
  topThreats?: ZIAThreatReport[];
  topViolations?: ZIADLPIncident[];
}

export interface ZIAListResponse<T> {
  data: T[];
  totalCount: number;
  pageSize?: number;
  pageNumber?: number;
}
