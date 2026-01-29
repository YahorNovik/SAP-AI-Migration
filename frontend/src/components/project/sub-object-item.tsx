"use client";

import { Ban, RotateCcw } from "lucide-react";
import { SapIcon } from "@/components/shared/sap-icon";
import type { SubObject } from "@/types/project";
import { cn } from "@/lib/utils";

interface SubObjectItemProps {
  subObject: SubObject;
  isActive: boolean;
  onClick: () => void;
  onToggleExclude: (sub: SubObject) => void;
}

const DOT_COLORS: Record<string, string> = {
  pending: "bg-slate-400",
  in_progress: "bg-blue-500",
  migrated: "bg-emerald-500",
  error: "bg-red-500",
  activated: "bg-green-500",
};

export function SubObjectItem({
  subObject,
  isActive,
  onClick,
  onToggleExclude,
}: SubObjectItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
        subObject.excluded && "opacity-50",
        isActive
          ? "bg-blue-50 text-blue-900 border border-blue-200"
          : "hover:bg-muted"
      )}
    >
      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          subObject.excluded
            ? "bg-slate-300"
            : (DOT_COLORS[subObject.status] ?? "bg-slate-400")
        )}
      />
      <SapIcon objtype={subObject.objtype} size={14} className="shrink-0 text-muted-foreground" />
      <span className={cn("truncate", subObject.excluded && "line-through")}>
        {subObject.name}
      </span>
      <span
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExclude(subObject);
        }}
        className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 transition-opacity text-muted-foreground hover:text-foreground"
      >
        {subObject.excluded ? <RotateCcw size={12} /> : <Ban size={12} />}
      </span>
    </button>
  );
}
