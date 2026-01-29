import { NextRequest, NextResponse } from "next/server";
import { migrationOrchestrator } from "@/services/migration-orchestrator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  migrationOrchestrator.pause(id);
  return NextResponse.json({ message: "Migration paused" });
}
