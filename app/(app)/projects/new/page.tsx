import { ProjectForm } from "@/components/ProjectForm";

export const metadata = { title: "Start a project · Support Mi Amigos" };

export default function NewProjectPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-[clamp(2rem,6vw,3rem)] font-extrabold">Start a project</h1>
        <p className="max-w-[56ch] text-muted">
          Pitch something the group wants. If pledges reach the goal by the deadline, it&apos;s funded. Only you will see
          who chipped in.
        </p>
      </div>
      <ProjectForm />
    </div>
  );
}
