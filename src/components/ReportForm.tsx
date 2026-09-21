"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestMediaUploadUrlsAction, submitEntryAction } from "@/app/actions";
import type { UploadedMedia } from "@/lib/services/entries.service";

// Uploads happen straight from this browser to R2 (see
// requestMediaUploadUrls's comment for why) rather than through the Server
// Action itself — so submitting a report is a multi-step client-driven
// process now, not a plain <form action>. Running several uploads at once
// (rather than all-at-once or strictly one-by-one) keeps a report with many
// files moving without saturating a construction site's connection.
const UPLOAD_CONCURRENCY = 3;

type Site = { id: number; name: string };

export function ReportForm({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const form = formRef.current!;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("media") as HTMLInputElement;
    // An unselected file input still shows up as one zero-byte File.
    const files = Array.from(fileInput.files ?? []).filter((f) => f.size > 0);

    setError(null);
    setPending(true);
    setStatus(files.length > 0 ? "Priprema..." : "Spremanje...");

    let batchToken = "";
    let media: UploadedMedia[] = [];

    try {
      if (files.length > 0) {
        const { batchToken: token, uploads } = await requestMediaUploadUrlsAction(
          files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
        );
        batchToken = token;

        let done = 0;
        const queue = uploads.map((upload, i) => ({ ...upload, file: files[i] }));
        async function worker() {
          let item;
          while ((item = queue.shift())) {
            const res = await fetch(item.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": item.file.type },
              body: item.file,
            });
            if (!res.ok) throw new Error(`Otpremanje nije uspjelo: ${item.file.name}`);
            done++;
            setStatus(`Otpremanje ${done}/${files.length}...`);
          }
        }
        await Promise.all(
          Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker),
        );

        media = uploads.map((u) => ({ key: u.key, kind: u.kind, type: u.type }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri otpremanju datoteka.");
      setPending(false);
      setStatus("");
      return;
    }

    setStatus("Spremanje...");
    try {
      await submitEntryAction(
        {
          description: String(formData.get("description") ?? ""),
          materialOnSite: formData.get("materialOnSite") === "on",
          materialMissingNote: String(formData.get("materialMissingNote") ?? ""),
          hasExtraPaidWork: formData.get("hasExtraPaidWork") === "on",
          extraPaidWorkNote: String(formData.get("extraPaidWorkNote") ?? ""),
          hasProblems: formData.get("hasProblems") === "on",
          problemsNote: String(formData.get("problemsNote") ?? ""),
          needsOrder: formData.get("needsOrder") === "on",
          orderNote: String(formData.get("orderNote") ?? ""),
        },
        Number(formData.get("siteId")),
        batchToken,
        media,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri spremanju.");
      setPending(false);
      setStatus("");
      return;
    }

    // The saved report stays on the same route ("/", just with ?saved=1),
    // so this component doesn't remount on navigation — reset its own
    // state explicitly rather than relying on a fresh mount to do it.
    form.reset();
    setPending(false);
    setStatus("");
    router.push("/?saved=1");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {sites.map((site, i) => (
          <label
            key={site.id}
            className="pill has-[:checked]:border-foreground has-[:checked]:bg-foreground has-[:checked]:text-white"
          >
            <input
              type="radio"
              name="siteId"
              value={site.id}
              defaultChecked={i === 0}
              required
              className="sr-only"
            />
            {site.name}
          </label>
        ))}
      </div>

      <div className="card flex flex-col gap-4">
        <div>
          <label htmlFor="media" className="field-label">
            Slike i videa
          </label>
          <div className="rounded-xl border-2 border-dashed border-border p-4 text-center transition-colors has-[:hover]:border-brand">
            <input
              id="media"
              name="media"
              type="file"
              accept="image/*,video/*"
              multiple
              // No `capture` attribute: with it set, some Android browsers
              // open the camera directly and skip the option to attach an
              // existing photo/video from the gallery. Omitting it lets
              // both Android and iOS show their normal picker.
              className="w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Što ste danas radili?
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={5}
            className="field-input resize-none"
          />
        </div>
      </div>

      <div className="card flex flex-col divide-y divide-border">
        <ToggleRow
          name="materialOnSite"
          label="Je li sav materijal na gradilištu?"
          defaultChecked
          noteName="materialMissingNote"
          notePlaceholder="Što nedostaje?"
          noteWhen="unchecked"
        />
        <ToggleRow
          name="hasExtraPaidWork"
          label="Ima li dodatnih radova za naplatu?"
          noteName="extraPaidWorkNote"
          notePlaceholder="Koji dodatni radovi?"
        />
        <ToggleRow
          name="hasProblems"
          label="Problemi ili zastoji?"
          noteName="problemsNote"
          notePlaceholder="Kakav problem?"
        />
        <ToggleRow
          name="needsOrder"
          label="Treba li nešto naručiti?"
          noteName="orderNote"
          notePlaceholder="Što treba naručiti?"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? status : "Spremi"}
      </button>
    </form>
  );
}

function ToggleRow({
  name,
  label,
  noteName,
  notePlaceholder,
  defaultChecked = false,
  noteWhen = "checked",
}: {
  name: string;
  label: string;
  noteName?: string;
  notePlaceholder?: string;
  defaultChecked?: boolean;
  noteWhen?: "checked" | "unchecked";
}) {
  // Most toggles reveal their note when switched ON (e.g. "problems?" ->
  // describe the problem). materialOnSite is the opposite: its "good"
  // state is ON, so its note ("what's missing?") only makes sense when
  // it's OFF — noteWhen picks which CSS variant combination applies.
  //
  // Both branches use the same "hidden by default, reveal via variant"
  // shape rather than the mirror image ("visible by default, hide via
  // variant") — the latter rendered as a zero-height box in testing, so
  // stick with the one actually proven to work. For the "unchecked" case,
  // :not(:checked) must be scoped to input[type=checkbox] specifically —
  // scoping it to just "input" still isn't enough, because the note field
  // *itself* is an <input> and a descendant of .group, and a text input
  // trivially satisfies :not(:checked) too (that pseudo-class isn't limited
  // to checkboxes) — so :has(input:not(:checked)) matched unconditionally,
  // against itself, regardless of the toggle's real state. Scoping to the
  // checkbox's actual type excludes the note field from the match.
  const noteVisibilityClass =
    noteWhen === "checked"
      ? "hidden group-has-[:checked]:block"
      : "hidden group-has-[input[type=checkbox]:not(:checked)]:block";

  return (
    // "group" here is what lets the note input below react to this
    // toggle's checked state via group-has-[:checked]: — pure CSS, no
    // client-side JavaScript needed to show/hide it.
    <div className="group py-3 first:pt-0 last:pb-0">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-sm">{label}</span>
        <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-border transition-colors has-[:checked]:bg-accent">
          <input
            type="checkbox"
            name={name}
            defaultChecked={defaultChecked}
            className="peer sr-only"
          />
          <span className="inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-[22px]" />
        </span>
      </label>
      {noteName && (
        <input
          type="text"
          name={noteName}
          placeholder={notePlaceholder}
          className={`field-input mt-2 ${noteVisibilityClass}`}
        />
      )}
    </div>
  );
}
