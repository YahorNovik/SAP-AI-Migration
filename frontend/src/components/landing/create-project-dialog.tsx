"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const OBJECT_TYPES = [
  { value: "PROG/P", label: "Report" },
  { value: "CLAS/OC", label: "Class" },
  { value: "INTF/OI", label: "Interface" },
  { value: "FUGR/F", label: "Function Group" },
  { value: "TABL/DT", label: "Table" },
  { value: "DDLS/DF", label: "CDS View" },
];

export function CreateProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState("");
  const [objtype, setObjtype] = useState("PROG/P");
  const [parentName, setParentName] = useState("$TMP");
  const [parentPath, setParentPath] = useState("/sap/bc/adt/packages/%24tmp");
  const [description, setDescription] = useState("");
  const [transportMode, setTransportMode] = useState<"local" | "transport">(
    "local"
  );
  const [transport, setTransport] = useState("");
  const [migrationRules, setMigrationRules] = useState("");
  const [sourceSystemId, setSourceSystemId] = useState("");
  const [targetSystemId, setTargetSystemId] = useState("");
  const [systems, setSystems] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/systems")
        .then((r) => r.json())
        .then(setSystems)
        .catch(() => {});
    }
  }, [open]);

  function handleParentNameChange(value: string) {
    setParentName(value);
    const encoded = encodeURIComponent(value.toLowerCase());
    setParentPath(`/sap/bc/adt/packages/${encoded}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.toUpperCase(),
        objtype,
        parentName,
        parentPath,
        description,
        transport: transportMode === "transport" ? transport : undefined,
        migrationRules: migrationRules || undefined,
        sourceSystemId: sourceSystemId || undefined,
        targetSystemId: targetSystemId || undefined,
      }),
    });

    setIsSubmitting(false);
    setName("");
    setDescription("");
    setTransport("");
    setMigrationRules("");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Migration Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Object Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ZMY_REPORT"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objtype">Object Type</Label>
            <Select value={objtype} onValueChange={setObjtype}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentName">Package</Label>
              <Input
                id="parentName"
                value={parentName}
                onChange={(e) => handleParentNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPath">Package Path</Label>
              <Input
                id="parentPath"
                value={parentPath}
                onChange={(e) => setParentPath(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Migration description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Transport</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={transportMode === "local"}
                  onChange={() => setTransportMode("local")}
                />
                Local ($TMP)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={transportMode === "transport"}
                  onChange={() => setTransportMode("transport")}
                />
                Transport
              </label>
            </div>
            {transportMode === "transport" && (
              <Input
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                placeholder="DEVK900123"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Migration Rules (optional)</Label>
            <Textarea
              value={migrationRules}
              onChange={(e) => setMigrationRules(e.target.value)}
              placeholder="Project-specific rules, e.g.: Use inline declarations, convert SELECT...ENDSELECT to SELECT INTO TABLE..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Extends global rules from Settings. Leave empty to use global
              rules only.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Source System</Label>
              <Select value={sourceSystemId} onValueChange={setSourceSystemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target System</Label>
              <Select value={targetSystemId} onValueChange={setTargetSystemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {systems.length === 0 && (
              <p className="col-span-2 text-xs text-muted-foreground">
                No systems configured.{" "}
                <Link href="/settings" className="text-blue-600 hover:underline">
                  Add one in Settings
                </Link>
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
