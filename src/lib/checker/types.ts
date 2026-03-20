export type CheckStatus = "operational" | "degraded" | "failed" | "error";

export interface CheckResult {
  status: CheckStatus;
  latency: number | null;
  errorMessage: string | null;
}

export interface DashboardConfig {
  id: string;
  name: string;
  model: string;
  currentStatus: CheckStatus;
  currentMessage: string | null;
  latency: number | null;
  lastCheckedAt: string | null;
  uptimePercent7d: number | null;
  uptimePercent15d: number | null;
  uptimePercent30d: number | null;
  history: DashboardHistoryEntry[];
}

export interface DashboardHistoryEntry {
  status: CheckStatus;
  latency: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface DashboardGroup {
  id: string;
  name: string;
  description: string | null;
  configs: DashboardConfig[];
}

export interface DashboardData {
  groups: DashboardGroup[];
  ungrouped: DashboardConfig[];
  lastUpdated: string;
}
