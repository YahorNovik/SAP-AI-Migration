import { NextRequest, NextResponse } from "next/server";
import { activityService } from "@/services/activity-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subObjectId =
    request.nextUrl.searchParams.get("subObjectId") ?? undefined;
  const logs = await activityService.listByProject(id, subObjectId);
  return NextResponse.json(logs);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { type, content, subObjectId } = body;

  if (!type || !content) {
    return NextResponse.json(
      { error: "Missing required fields: type, content" },
      { status: 400 }
    );
  }

  const log = await activityService.create(id, type, content, subObjectId);
  return NextResponse.json(log, { status: 201 });
}
