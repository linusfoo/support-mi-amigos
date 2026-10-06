import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { canEditProject } from "@/lib/rules";
import { deleteProject } from "@/app/actions";
import { ProjectForm } from "@/components/ProjectForm";
import { ConfirmButton } from "@/components/ConfirmButton";

export default async function EditProjectPage({ params }: PageProps<"/projects/[id]/edit">) {
  const { id } = await params;
  const viewer = await requireUser();
  const project = Number.isInteger(Number(id)) ? await getProject(Number(id), viewer) : null;
  if (!project) notFound();
  if (!canEditProject(viewer, project)) redirect(`/projects/${project.id}`);

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <p className="text-muted">
          <Link href={`/projects/${project.id}`}>Back to the project</Link>
        </p>
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-extrabold">Edit project</h1>
      </div>
      <ProjectForm initial={project} />
      <form action={deleteProject} className="grid gap-2 border-t border-rule pt-6">
        <input type="hidden" name="id" value={project.id} />
        <p className="text-muted">
          Deleting removes the project and every pledge on it.
          {project.backer_count === 1 && " 1 amigo has pledged."}
          {project.backer_count > 1 && ` ${project.backer_count} amigos have pledged.`}
        </p>
        <div>
          <ConfirmButton question={`Delete "${project.title}" and all its pledges?`}>Delete project</ConfirmButton>
        </div>
      </form>
    </div>
  );
}
