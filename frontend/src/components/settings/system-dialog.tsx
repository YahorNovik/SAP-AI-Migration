"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SapSystem } from "@/types/system";

interface SystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  editSystem?: SapSystem | null;
}

export function SystemDialog({
  open,
  onOpenChange,
  onSaved,
  editSystem,
}: SystemDialogProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [client, setClient] = useState("");
  const [language, setLanguage] = useState("EN");
  const [allowUnauthorizedCerts, setAllowUnauthorizedCerts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editSystem;

  useEffect(() => {
    if (editSystem) {
      setName(editSystem.name);
      setUrl(editSystem.url);
      setUser(editSystem.user);
      setPassword("");
      setClient(editSystem.client);
      setLanguage(editSystem.language);
      setAllowUnauthorizedCerts(editSystem.allowUnauthorizedCerts);
    } else {
      setName("");
      setUrl("");
      setUser("");
      setPassword("");
      setClient("");
      setLanguage("EN");
      setAllowUnauthorizedCerts(false);
    }
    setError("");
  }, [editSystem, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const body: Record<string, unknown> = {
      name,
      url,
      user,
      client,
      language,
      allowUnauthorizedCerts,
    };
    // Only include password if provided (for edit, empty means "don't change")
    if (password) {
      body.password = password;
    }
    // For create, password is required
    if (!isEditing && !password) {
      setError("Password is required");
      setIsSubmitting(false);
      return;
    }

    const endpoint = isEditing
      ? `/api/systems/${editSystem.id}`
      : "/api/systems";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save system");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${editSystem.name}` : "Add SAP System"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="sys-name">System Name</Label>
            <Input
              id="sys-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="DEV, QAS, PRD..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sys-url">URL</Label>
            <Input
              id="sys-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://sap-server.company.com:44300"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sys-user">User</Label>
              <Input
                id="sys-user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="SAP username"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sys-password">
                Password{isEditing ? " (leave blank to keep)" : ""}
              </Label>
              <Input
                id="sys-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEditing ? "••••••" : ""}
                required={!isEditing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sys-client">Client</Label>
              <Input
                id="sys-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sys-lang">Language</Label>
              <Input
                id="sys-lang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="EN"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowUnauthorizedCerts}
              onChange={(e) => setAllowUnauthorizedCerts(e.target.checked)}
            />
            Allow unauthorized SSL certificates
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name || !url || !user || isSubmitting}>
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Add System"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
