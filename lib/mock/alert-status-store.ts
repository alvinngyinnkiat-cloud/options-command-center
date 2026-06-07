import type { AlertStatus } from "@/lib/alerts/types";

const statusMap = new Map<string, AlertStatus>();

export function getMockAlertStatuses(): Map<string, AlertStatus> {
  return new Map(statusMap);
}

export function setMockAlertStatus(key: string, status: AlertStatus): void {
  statusMap.set(key, status);
}

export function clearMockAlertStatus(key: string): void {
  statusMap.delete(key);
}
