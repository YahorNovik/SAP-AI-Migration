import { NextRequest, NextResponse } from "next/server";
import { projectService } from "@/services/project-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await projectService.getById(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const migratedCount = project.subObjects.filter(
    (s) => s.status === "migrated" || s.status === "activated"
  ).length;

  const objectCount = new Set(
    project.subObjects.map((s) => s.parentObjectName || s.name)
  ).size;

  return NextResponse.json({
    ...project,
    migratedCount,
    totalCount: project.subObjects.length,
    objectCount,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const project = await projectService.update(id, body);
  return NextResponse.json(project);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await projectService.delete(id);
  return NextResponse.json({ message: "Project deleted" });
}
