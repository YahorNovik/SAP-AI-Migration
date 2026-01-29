import { ProjectLayout } from "@/components/project/project-layout";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectLayout projectId={id} />;
}
