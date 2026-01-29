"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Server, Brain } from "lucide-react";
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
import { SystemCard } from "./system-card";
import { SystemDialog } from "./system-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import type { SapSystem } from "@/types/system";
import { LLM_PROVIDERS } from "@/types/settings";

export function SettingsLayout() {
  const [systems, setSystems] = useState<SapSystem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSystem, setEditSystem] = useState<SapSystem | null>(null);

  // AI settings state
  const [llmProvider, setLlmProvider] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [globalMigrationRules, setGlobalMigrationRules] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSaved, setAiSaved] = useState(false);

  const fetchSystems = useCallback(async () => {
    const res = await fetch("/api/systems");
    const data = await res.json();
    setSystems(data);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setLlmProvider(data.llmProvider ?? "");
    setLlmApiKey(""); // Never pre-fill — masked value is useless
    setLlmModel(data.llmModel ?? "");
    setGlobalMigrationRules(data.globalMigrationRules ?? "");
  }, []);

  useEffect(() => {
    fetchSystems();
    fetchSettings();
  }, [fetchSystems, fetchSettings]);

  function handleEdit(system: SapSystem) {
    setEditSystem(system);
    setDialogOpen(true);
  }

  async function handleDelete(system: SapSystem) {
    if (!confirm(`Delete system "${system.name}"?`)) return;

    const res = await fetch(`/api/systems/${system.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete system");
      return;
    }
    fetchSystems();
  }

  function handleAdd() {
    setEditSystem(null);
    setDialogOpen(true);
  }

  async function handleSaveAiSettings() {
    setAiSaving(true);
    const body: Record<string, string> = {
      llmProvider,
      llmModel,
      globalMigrationRules,
    };
    // Only send API key if user typed a new one
    if (llmApiKey) {
      body.llmApiKey = llmApiKey;
    }
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAiSaving(false);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 2000);
  }

  const selectedProvider = LLM_PROVIDERS.find((p) => p.value === llmProvider);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} />
            Back to projects
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">
            Configure AI providers, SAP connections, and migration rules
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl p-6 space-y-8">
        {/* AI Configuration */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Brain size={20} className="text-purple-600" />
            <h2 className="text-lg font-semibold">AI Configuration</h2>
          </div>
          <div className="bg-white border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>LLM Provider</Label>
                <Select value={llmProvider} onValueChange={setLlmProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="Enter API key..."
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder={
                    selectedProvider?.defaultModel ?? "e.g. claude-sonnet-4-20250514"
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Global Migration Rules</Label>
              <Textarea
                value={globalMigrationRules}
                onChange={(e) => setGlobalMigrationRules(e.target.value)}
                placeholder="Enter default migration rules that apply to all projects. E.g.: Convert to clean ABAP syntax, use inline declarations, add structured exception handling..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                These rules are injected into the migration agent's system
                prompt for every project. Per-project rules can override or
                extend them.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveAiSettings}
                disabled={aiSaving || !llmProvider}
              >
                {aiSaving ? "Saving..." : "Save AI Settings"}
              </Button>
              {aiSaved && (
                <span className="text-sm text-green-600">Saved</span>
              )}
            </div>
          </div>
        </section>

        {/* SAP Systems */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold">SAP Systems</h2>
            </div>
            <Button onClick={handleAdd} className="gap-1" size="sm">
              <Plus size={16} />
              Add System
            </Button>
          </div>

          {systems.length === 0 ? (
            <EmptyState
              icon={Server}
              title="No SAP systems configured"
              description="Add a SAP system connection to start using it in your migration projects."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <SystemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={fetchSystems}
        editSystem={editSystem}
      />
    </div>
  );
}
