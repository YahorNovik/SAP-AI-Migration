import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project-service";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") ?? undefined;
  const projects = await projectService.list(status);
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, objtype, parentName, parentPath, description, transport, migrationRules, sourceSystemId, targetSystemId } = body;

  if (!name || !objtype || !parentName || !parentPath) {
    return NextResponse.json(
      { error: "Missing required fields: name, objtype, parentName, parentPath" },
      { status: 400 }
    );
  }

  const project = await projectService.create({
    name,
    objtype,
    parentName,
    parentPath,
    description: description || "",
    transport,
    migrationRules,
    sourceSystemId,
    targetSystemId,
  });

  return NextResponse.json(project, { status: 201 });
}
