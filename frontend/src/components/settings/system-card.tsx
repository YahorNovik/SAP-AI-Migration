"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Server } from "lucide-react";
import type { SapSystem } from "@/types/system";

interface SystemCardProps {
  system: SapSystem;
  onEdit: (system: SapSystem) => void;
  onDelete: (system: SapSystem) => void;
}

export function SystemCard({ system, onEdit, onDelete }: SystemCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-blue-600" />
            <h3 className="font-semibold">{system.name}</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(system)}
              className="h-7 w-7 p-0"
            >
              <Pencil size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(system)}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">URL</span>
            <span className="truncate ml-4 max-w-[240px]">{system.url}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">User</span>
            <span>{system.user}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span>{system.client || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Language</span>
            <span>{system.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Password</span>
            <span className="tracking-widest">••••••</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
