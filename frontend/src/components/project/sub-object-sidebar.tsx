"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SapIcon } from "@/components/shared/sap-icon";
import { SubObjectItem } from "./sub-object-item";
import type { SubObject } from "@/types/project";
import { cn } from "@/lib/utils";

interface SubObjectSidebarProps {
  subObjects: SubObject[];
  activeId: string | null;
  onSelect: (sub: SubObject) => void;
  onToggleExclude: (sub: SubObject) => void;
}

interface ObjectGroup {
  parentObjectName: string;
  parentObjectType: string;
  objectOrder: number;
  subObjects: SubObject[];
  doneCount: number;
  excludedCount: number;
}

export function SubObjectSidebar({
  subObjects,
  activeId,
  onSelect,
  onToggleExclude,
}: SubObjectSidebarProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups: ObjectGroup[] = useMemo(() => {
    const map = new Map<string, ObjectGroup>();
    for (const sub of subObjects) {
      const key = sub.parentObjectName || sub.name;
      if (!map.has(key)) {
        map.set(key, {
          parentObjectName: sub.parentObjectName || sub.name,
          parentObjectType: sub.parentObjectType || sub.objtype,
          objectOrder: sub.objectOrder,
          subObjects: [],
          doneCount: 0,
          excludedCount: 0,
        });
      }
      const group = map.get(key)!;
      group.subObjects.push(sub);
      if (sub.excluded) {
        group.excludedCount++;
      } else if (sub.status === "activated" || sub.status === "migrated") {
        group.doneCount++;
      }
    }
    return [...map.values()].sort((a, b) => a.objectOrder - b.objectOrder);
  }, [subObjects]);

  const toggleGroup = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const multipleGroups = groups.length > 1;

  return (
    <div className="h-full border-r bg-white flex flex-col">
      <div className="px-3 py-2 border-b">
        <h2 className="text-sm font-medium text-muted-foreground">
          {multipleGroups
            ? `Objects (${groups.length}) / Sub-Objects (${subObjects.length})`
            : `Sub-Objects (${subObjects.length})`}
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {groups.map((group) => {
            const activeCount = group.subObjects.length - group.excludedCount;
            return (
              <div key={group.parentObjectName}>
                {multipleGroups && (
                  <button
                    onClick={() => toggleGroup(group.parentObjectName)}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted",
                      group.doneCount === activeCount &&
                        activeCount > 0 &&
                        "text-green-700",
                      group.excludedCount === group.subObjects.length &&
                        "opacity-50",
                    )}
                  >
                    {collapsed.has(group.parentObjectName) ? (
                      <ChevronRight size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                    <SapIcon
                      objtype={group.parentObjectType}
                      size={12}
                      className="shrink-0"
                    />
                    <span className="truncate">{group.parentObjectName}</span>
                    <span className="ml-auto text-[10px]">
                      {group.doneCount}/{activeCount}
                      {group.excludedCount > 0 && (
                        <span className="text-slate-400">
                          {" "}
                          ({group.excludedCount} skipped)
                        </span>
                      )}
                    </span>
                  </button>
                )}
                {!collapsed.has(group.parentObjectName) && (
                  <div className={multipleGroups ? "pl-4" : ""}>
                    {group.subObjects.map((sub) => (
                      <SubObjectItem
                        key={sub.id}
                        subObject={sub}
                        isActive={activeId === sub.id}
                        onClick={() => onSelect(sub)}
                        onToggleExclude={onToggleExclude}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
