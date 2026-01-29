import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { activityService } from "@/services/activity-service";
import { eventBus } from "@/services/migration-orchestrator";
import { getModel } from "@/services/ai/model";
import { buildChatSystemPrompt } from "@/services/ai/prompts";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { message } = body;

  if (!message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  // Store user message
  const userLog = await activityService.create(id, "user_message", message);
  eventBus.emit(id, "activity", userLog);

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        subObjects: { orderBy: { order: "asc" } },
        activityLogs: { orderBy: { timestamp: "desc" }, take: 20 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const contextSummary = [
      `Project: ${project.name} (${project.objtype})`,
      `Status: ${project.status}`,
      `Sub-objects: ${project.subObjects.map((s) => `${s.name} [${s.status}]`).join(", ") || "None discovered yet"}`,
      `Recent activity:\n${project.activityLogs
        .slice(0, 10)
        .map((a) => `  [${a.type}] ${a.content}`)
        .join("\n")}`,
    ].join("\n");

    // Build conversation from previous chat messages
    const previousMessages = await prisma.activityLog.findMany({
      where: {
        projectId: id,
        type: { in: ["user_message", "agent_message"] },
      },
      orderBy: { timestamp: "asc" },
      take: 20,
    });

    const conversationMessages = previousMessages.map((m) => ({
      role: (m.type === "user_message" ? "user" : "assistant") as
        | "user"
        | "assistant",
      content: m.content,
    }));

    const model = await getModel();
    const systemPrompt = await buildChatSystemPrompt(contextSummary);

    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages: [...conversationMessages, { role: "user" as const, content: message }],
      maxOutputTokens: 2000,
    });

    const agentLog = await activityService.create(id, "agent_message", text);
    eventBus.emit(id, "activity", agentLog);

    return NextResponse.json({ userLog, agentLog }, { status: 201 });
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    const agentLog = await activityService.create(
      id,
      "agent_message",
      `Error: ${errorMsg}`
    );
    eventBus.emit(id, "activity", agentLog);
    return NextResponse.json({ userLog, agentLog }, { status: 201 });
  }
}
