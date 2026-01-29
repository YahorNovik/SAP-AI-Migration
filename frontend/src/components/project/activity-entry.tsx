"use client";

import {
  Search,
  Code,
  AlertTriangle,
  Wrench,
  CheckCircle,
  User,
  Bot,
  AlertCircle,
  Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ActivityLog } from "@/types/project";

const ICON_MAP: Record<string, React.ElementType> = {
  discovery: Search,
  write: Code,
  check: AlertTriangle,
  fix: Wrench,
  activate: CheckCircle,
  user_message: User,
  agent_message: Bot,
  error: AlertCircle,
  info: Info,
};

const TYPE_COLORS: Record<string, string> = {
  discovery: "text-purple-600",
  write: "text-blue-600",
  check: "text-amber-600",
  fix: "text-orange-600",
  activate: "text-green-600",
  user_message: "text-slate-600",
  agent_message: "text-indigo-600",
  error: "text-red-600",
  info: "text-slate-500",
};

export function ActivityEntry({ log }: { log: ActivityLog }) {
  const Icon = ICON_MAP[log.type] ?? Info;
  const colorClass = TYPE_COLORS[log.type] ?? "text-slate-500";

  return (
    <div className="flex gap-2 py-2 px-3 text-sm">
      <Icon size={16} className={`${colorClass} shrink-0 mt-0.5`} />
      <div className="min-w-0 flex-1">
        <p className="text-foreground">{log.content}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}
