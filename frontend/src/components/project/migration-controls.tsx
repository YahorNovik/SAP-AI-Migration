"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Check } from "lucide-react";

interface MigrationControlsProps {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function MigrationControls({
  status,
  onStart,
  onPause,
  onResume,
}: MigrationControlsProps) {
  switch (status) {
    case "open":
      return (
        <Button size="sm" onClick={onStart} className="gap-1">
          <Play size={14} />
          Start Migration
        </Button>
      );
    case "in_progress":
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={onPause}
          className="gap-1"
        >
          <Pause size={14} />
          Pause
        </Button>
      );
    case "paused":
      return (
        <Button size="sm" onClick={onResume} className="gap-1">
          <Play size={14} />
          Resume
        </Button>
      );
    case "completed":
      return (
        <Button size="sm" variant="ghost" disabled className="gap-1">
          <Check size={14} />
          Completed
        </Button>
      );
    case "error":
      return (
        <Button
          size="sm"
          variant="destructive"
          onClick={onStart}
          className="gap-1"
        >
          <RotateCcw size={14} />
          Retry
        </Button>
      );
    default:
      return null;
  }
}
