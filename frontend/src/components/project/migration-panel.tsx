"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { registerAbapLanguage } from "@/lib/abap-monaco";
import type { BeforeMount } from "@monaco-editor/react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface MigrationPanelProps {
  source: string;
  isDirty: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

const handleBeforeMount: BeforeMount = (monaco) => {
  registerAbapLanguage(monaco);
};

export function MigrationPanel({
  source,
  isDirty,
  onChange,
  onSave,
}: MigrationPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-600 flex items-center justify-between">
        <span>Migrated Source</span>
        {isDirty && (
          <Button size="sm" variant="outline" onClick={onSave} className="h-6 text-xs gap-1">
            <Save size={12} />
            Save
          </Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="abap"
          value={source}
          beforeMount={handleBeforeMount}
          onChange={(value) => onChange(value ?? "")}
          options={{
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
          theme="vs"
        />
      </div>
    </div>
  );
}
