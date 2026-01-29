import { FileCode, Box, Plug, FolderCode, File, Table, Database } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  "PROG/P": FileCode,
  "PROG/I": FileCode,
  "CLAS/OC": Box,
  "INTF/OI": Plug,
  "FUGR/F": FolderCode,
  "FUGR/FF": FolderCode,
  "TABL/DT": Table,
  "DDLS/DF": Database,
  "DEVC/K": FolderCode,
};

interface SapIconProps {
  objtype: string;
  className?: string;
  size?: number;
}

export function SapIcon({ objtype, className, size = 20 }: SapIconProps) {
  const Icon = ICON_MAP[objtype] ?? File;
  return <Icon className={className} size={size} />;
}
