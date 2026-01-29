import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  migrated: number;
  total: number;
  className?: string;
}

export function ProgressIndicator({
  migrated,
  total,
  className,
}: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((migrated / total) * 100) : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {migrated}/{total} objects migrated
        </span>
        <span className="text-xs font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
