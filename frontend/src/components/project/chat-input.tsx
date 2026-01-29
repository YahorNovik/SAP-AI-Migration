"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActivityEntry } from "./activity-entry";
import { useMigrationStore } from "@/stores/migration-store";

interface ChatInputProps {
  projectId: string;
}

export function ChatInput({ projectId }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const activities = useMigrationStore((s) => s.activities);

  const chatMessages = activities.filter(
    (a) => a.type === "user_message" || a.type === "agent_message"
  );

  async function handleSend() {
    if (!message.trim()) return;
    setIsSending(true);

    await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });

    setMessage("");
    setIsSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {chatMessages.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Send a message to interact with the migration agent.
            </div>
          ) : (
            chatMessages.map((log) => (
              <ActivityEntry key={log.id} log={log} />
            ))
          )}
        </div>
      </ScrollArea>
      <div className="border-t p-2 flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="resize-none min-h-[36px]"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="shrink-0"
        >
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
