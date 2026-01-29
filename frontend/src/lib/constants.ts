export const PROJECT_STATUSES = ["open", "in_progress", "paused", "completed", "error"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const SUB_OBJECT_STATUSES = ["pending", "in_progress", "migrated", "error", "activated"] as const;
export type SubObjectStatus = (typeof SUB_OBJECT_STATUSES)[number];

export const ACTIVITY_TYPES = [
  "discovery", "write", "check", "fix", "activate",
  "user_message", "agent_message", "error", "info",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  "PROG/P": "Report",
  "CLAS/OC": "Class",
  "INTF/OI": "Interface",
  "FUGR/F": "Function Group",
  "FUGR/FF": "Function Module",
  "TABL/DT": "Table",
  "DDLS/DF": "CDS View",
  "DEVC/K": "Package",
  "DTEL/DE": "Data Element",
  "MSAG/N": "Message Class",
};

export const STATUS_COLORS: Record<string, string> = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  paused: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-700",
  migrated: "bg-emerald-100 text-emerald-700",
  activated: "bg-green-100 text-green-700",
};

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  paused: "Paused",
  completed: "Completed",
  error: "Error",
  pending: "Pending",
  migrated: "Migrated",
  activated: "Activated",
};
