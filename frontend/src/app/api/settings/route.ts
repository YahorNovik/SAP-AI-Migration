import { NextRequest, NextResponse } from "next/server";
import { settingService } from "@/services/setting-service";

const SENSITIVE_KEYS = ["llmApiKey"];

function maskValue(key: string, value: string): string {
  if (SENSITIVE_KEYS.includes(key) && value.length > 8) {
    return value.slice(0, 4) + "•".repeat(value.length - 8) + value.slice(-4);
  }
  return value;
}

export async function GET() {
  const settings = await settingService.getAll();
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    masked[key] = maskValue(key, value);
  }
  return NextResponse.json(masked);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string") {
      entries[key] = value;
    }
  }

  await settingService.setMany(entries);
  return NextResponse.json({ ok: true });
}
