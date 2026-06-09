// ZPA Interfaces
export interface ZPAApplication {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  enabled: boolean;
  createdTime?: number;
  modifiedTime?: number;
}

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

export interface ZPAListResponse<T> {
  data: T[];
  totalCount: number;
  pageSize?: number;
  pageNumber?: number;
}
