"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityLog } from "./activity-log";
import { ChatInput } from "./chat-input";

interface BottomPanelProps {
  projectId: string;
}

export function BottomPanel({ projectId }: BottomPanelProps) {
  return (
    <div className="h-full border-t bg-white flex flex-col">
      <Tabs defaultValue="activity" className="flex flex-col h-full">
        <TabsList className="mx-2 mt-1 w-fit">
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="flex-1 min-h-0 m-0">
          <ActivityLog />
        </TabsContent>
        <TabsContent value="chat" className="flex-1 min-h-0 m-0">
          <ChatInput projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
