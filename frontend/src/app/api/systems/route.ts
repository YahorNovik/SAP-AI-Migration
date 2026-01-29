import { NextRequest, NextResponse } from "next/server";
import { systemService } from "@/services/system-service";

export async function GET() {
  const systems = await systemService.list();
  return NextResponse.json(systems);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, url, user, password, client, language, allowUnauthorizedCerts } =
    body;

  if (!name || !url || !user || !password) {
    return NextResponse.json(
      { error: "Missing required fields: name, url, user, password" },
      { status: 400 }
    );
  }

  try {
    const system = await systemService.create({
      name,
      url,
      user,
      password,
      client,
      language,
      allowUnauthorizedCerts,
    });
    return NextResponse.json(system, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: `A system named "${name}" already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
