"use client";

import dynamic from "next/dynamic";
import { registerAbapLanguage } from "@/lib/abap-monaco";
import type { BeforeMount } from "@monaco-editor/react";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface SourcePanelProps {
  source: string;
}

const handleBeforeMount: BeforeMount = (monaco) => {
  registerAbapLanguage(monaco);
};

export function SourcePanel({ source }: SourcePanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-600">
        Original Source
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="abap"
          value={source}
          beforeMount={handleBeforeMount}
          options={{
            readOnly: true,
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
