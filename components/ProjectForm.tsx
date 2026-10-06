import { saveProject } from "@/app/actions";
import { toDateInput } from "@/lib/format";
import { ActionForm } from "./ActionForm";

type Initial = { id: number; title: string; description: string; goal_cents: number; deadline: Date };

export function ProjectForm({ initial }: { initial?: Initial }) {
  const today = toDateInput(new Date());
  return (
    <ActionForm
      action={saveProject}
      submitLabel={initial ? "Save changes" : "Start project"}
      pendingLabel="Saving…"
      className="grid max-w-xl gap-5"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="field">
        <span>What are we funding?</span>
        <input
          className="input"
          name="title"
          defaultValue={initial?.title}
          placeholder="Karaoke machine for Friday nights"
          minLength={3}
          maxLength={80}
          required
        />
      </label>
      <label className="field">
        <span>Why it&apos;s worth it</span>
        <textarea
          className="input min-h-32"
          name="description"
          defaultValue={initial?.description}
          maxLength={2000}
          placeholder="What it is, where it'll live, and what happens to the money."
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="field">
          <span>Goal in dollars</span>
          <input
            className="input"
            name="goal"
            inputMode="decimal"
            defaultValue={initial ? initial.goal_cents / 100 : undefined}
            placeholder="200"
            required
          />
        </label>
        <label className="field">
          <span>Deadline</span>
          <input
            className="input"
            name="deadline"
            type="date"
            min={initial ? undefined : today}
            defaultValue={initial ? toDateInput(initial.deadline) : undefined}
            required
          />
          <small>Pledges close at the end of this day.</small>
        </label>
      </div>
    </ActionForm>
  );
}
