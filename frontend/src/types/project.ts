import type { ProjectStatus } from "@/lib/constants";

export interface Project {
  id: string;
  name: string;
  objtype: string;
  parentName: string;
  parentPath: string;
  description: string;
  transport: string | null;
  migrationRules: string;
  status: ProjectStatus;
  sourceSystemId: string | null;
  targetSystemId: string | null;
  sourceSystem?: { id: string; name: string } | null;
  targetSystem?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  subObjects?: SubObject[];
  activityLogs?: ActivityLog[];
  migratedCount?: number;
  totalCount?: number;
}

export interface SubObject {
  id: string;
  projectId: string;
  name: string;
  objtype: string;
  sourceUrl: string;
  objectUrl: string;
  originalSource: string;
  migratedSource: string;
  status: string;
  order: number;
  dependsOn: string | null;
  parentObjectName: string;
  parentObjectType: string;
  objectOrder: number;
  excluded: boolean;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  subObjectId: string | null;
  type: string;
  content: string;
  timestamp: string;
}

export interface CreateProjectInput {
  name: string;
  objtype: string;
  parentName: string;
  parentPath: string;
  description: string;
  transport?: string;
  migrationRules?: string;
  sourceSystemId?: string;
  targetSystemId?: string;
}
