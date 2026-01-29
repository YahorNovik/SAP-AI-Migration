"use client";

import { Plus } from "lucide-react";

interface NewProjectTileProps {
  onClick: () => void;
}

export function NewProjectTile({ onClick }: NewProjectTileProps) {
  return (
    <button
      onClick={onClick}
      className="h-full min-h-[160px] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
    >
      <Plus className="h-8 w-8 text-muted-foreground/50" />
      <span className="text-sm text-muted-foreground">New Project</span>
    </button>
  );
}
