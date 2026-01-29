import { NextRequest, NextResponse } from "next/server";
import { systemService } from "@/services/system-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const system = await systemService.getById(id);
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }
  return NextResponse.json(system);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const system = await systemService.update(id, body);
    return NextResponse.json(system);
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A system with that name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await systemService.delete(id);
    return NextResponse.json({ message: "System deleted" });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}
