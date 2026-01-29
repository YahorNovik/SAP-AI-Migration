import { NextRequest, NextResponse } from "next/server";
import { subObjectService } from "@/services/sub-object-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subObjects = await subObjectService.listByProject(id);
  return NextResponse.json(subObjects);
}
