import { NextRequest, NextResponse } from "next/server";
import { subObjectService } from "@/services/sub-object-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { subId } = await params;
  const body = await request.json();
  const { excluded, ...rest } = body;

  if (typeof excluded === "boolean") {
    const subObject = await subObjectService.toggleExcluded(subId, excluded);
    return NextResponse.json(subObject);
  }

  const subObject = await subObjectService.update(subId, rest);
  return NextResponse.json(subObject);
}
