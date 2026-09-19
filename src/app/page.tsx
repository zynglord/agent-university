"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Diploma, HireResult } from "@/lib/types";

type WorldSnap = {
  agents: Array<{
    ansName: string;
    displayName: string;
    domain: string;
    role: string;
    version: string;
    domainVerified: boolean;
    danePinned: boolean;
    tlSealed: boolean;
    accredited: boolean;
    revoked: boolean;
    publicKey: string;
  }>;
  courses: Array<{
    id: string;
    code: string;
    title: string;
    credits: number;
    universityAns: string;
    professorAns: string;
    guestLecturerAns?: string;
    description: string;
  }>;
  students: Array<{
    ansName: string;
    displayName: string;
    homeUniversityAns?: string;
    enrolledCourseIds: string[];
    credits: Array<{
      id: string;
      courseCode: string;
      title: string;
      credits: number;
      fromUniversityAns: string;
      transferStatus: string;
      acceptedByUniversityAns?: string;
    }>;
  }>;
  diplomas: Diploma[];
  log: Array<{
    index: number;
    at: string;
    type: string;
    ansName: string;
    hash: string;
    receipt: string;
    payload: Record<string, unknown>;
  }>;
  bus: Array<{
    id: string;
    at: string;
    from: string;
    to: string;
    kind: string;
    body: string;
    verified: boolean;
  }>;
  constants: {
    uni: string;
    poly: string;
    mill: string;
    board: string;
    employer: string;
    prof: string;
    guest: string;
    ra: string;
  };
};

type Tab = "journey" | "registry" | "log" | "attacks";

export default function Home() {
  const [world, setWorld] = useState<WorldSnap | null>(null);
  const [tab, setTab] = useState<Tab>("journey");
  const [name, setName] = useState("Nova");
  const [studentAns, setStudentAns] = useState<string | null>(null);
  const [diploma, setDiploma] = useState<Diploma | null>(null);
  const [millDip, setMillDip] = useState<Diploma | null>(null);
  const [hire, setHire] = useState<HireResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/world");
    setWorld(await res.json());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const student = useMemo(
    () => world?.students.find((s) => s.ansName === studentAns) ?? null,
    [world, studentAns],
  );

  async function act(action: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/campus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      await refresh();
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function startStudent() {
    const json = await act("ensureStudent", { name });
    if (json?.student) {
      setStudentAns(json.student.ansName);
      setToast(`Student agent ready: ${json.student.ansName}`);
    }
  }

  async function doEnroll(courseId: string) {
    if (!studentAns) return;
    await act("enroll", { studentAns, courseId });
    setToast("Enrolled (professor/guest ANS verified)");
  }

  async function doComplete(courseId: string) {
    if (!studentAns) return;
    await act("complete", { studentAns, courseId });
    setToast("Course completed → credits minted");
  }

  async function doGraduate() {
    if (!studentAns || !world) return;
    const json = await act("graduate", {
      studentAns,
      issuerAns: world.constants.uni,
      program: "B.S. Autonomous Systems",
    });
    if (json?.diploma) {
      setDiploma(json.diploma);
      setToast("Diploma issued + sealed in transparency log");
    }
  }

  async function doMill() {
    const json = await act("millDiploma", { name });
    if (json?.diploma) {
      setMillDip(json.diploma);
      setToast("Mill diploma purchased (no coursework)");
    }
  }

  async function doHire(d: Diploma) {
    setBusy(true);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diploma: d, tier: "silver" }),
      });
      setHire(await res.json());
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function attackBump() {
    if (!world) return;
    await act("bumpIssuer", { ansName: world.constants.uni });
    setToast("University version bumped — old diplomas version-bind may fail");
  }

  const uniCourses =
    world?.courses.filter((c) => c.universityAns === world.constants.uni) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {toast && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-2xl border border-sky-400/40 bg-slate-950 px-4 py-3 text-sm text-sky-100 shadow-lg">
          {toast}
          <button
            type="button"
            className="ml-3 text-slate-500"
            onClick={() => setToast(null)}
          >
            ✕
          </button>
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300/80">
            Best use of ANS · VTHacks
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">
            Agent University
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Domain-anchored agent identity, accreditation chain, coursework,
            verifiable diplomas, and hiring that rejects diploma mills — ANS is
            the trust layer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["journey", "Journey"],
              ["registry", "ANS Registry"],
              ["log", "Transparency Log"],
              ["attacks", "Attacks"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === id
                  ? "bg-sky-400 text-slate-950"
                  : "border border-white/15 text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {tab === "journey" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <h2 className="text-lg font-medium text-white">1 · Create student agent</h2>
              <div className="mt-3 flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={startStudent}
                  className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Register + ACME
                </button>
              </div>
              {student && (
                <p className="mt-3 break-all font-mono text-[11px] text-emerald-300">
                  {student.ansName}
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <h2 className="text-lg font-medium text-white">2 · Enroll & complete courses</h2>
              <p className="mt-1 text-xs text-slate-500">
                Enrollment verifies professor (and guest lecturer) ANS identities.
              </p>
              <div className="mt-4 space-y-3">
                {uniCourses.map((c) => {
                  const done = student?.credits.some((x) => x.courseCode === c.code);
                  const enrolled = student?.enrolledCourseIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-white/5 bg-black/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {c.code} · {c.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {c.credits} credits · {c.description}
                          </p>
                          {c.guestLecturerAns && (
                            <p className="mt-1 text-[11px] text-violet-300">
                              Guest lecturer ANS required
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            disabled={busy || !studentAns || enrolled}
                            onClick={() => doEnroll(c.id)}
                            className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-xs text-sky-200 disabled:opacity-40"
                          >
                            Enroll
                          </button>
                          <button
                            type="button"
                            disabled={busy || !enrolled || done}
                            onClick={() => doComplete(c.id)}
                            className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-40"
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                      {done && (
                        <p className="mt-2 text-xs text-emerald-400">Credit earned ✓</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {student && student.credits.length > 0 && world && (
                <div className="mt-4 rounded-2xl border border-white/5 p-3">
                  <p className="text-sm text-white">Transfer a credit to PolyAgent Tech</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {student.credits.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        disabled={busy || c.transferStatus === "accepted"}
                        onClick={() =>
                          act("transfer", {
                            studentAns,
                            creditId: c.id,
                            toUniversityAns: world.constants.poly,
                          }).then(() => setToast(`Transfer ${c.transferStatus}`))
                        }
                        className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-slate-300"
                      >
                        {c.courseCode} → Poly ({c.transferStatus})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-emerald-400/30 bg-slate-950/70 p-5">
                <h2 className="text-white">3a · Graduate AgentU</h2>
                <button
                  type="button"
                  disabled={busy || !studentAns}
                  onClick={doGraduate}
                  className="mt-3 w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
                >
                  Issue accredited diploma
                </button>
                {diploma && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => doHire(diploma)}
                    className="mt-2 w-full rounded-xl border border-emerald-300/40 py-2 text-sm text-emerald-200"
                  >
                    Apply to Acme
                  </button>
                )}
              </div>
              <div className="rounded-3xl border border-rose-400/30 bg-slate-950/70 p-5">
                <h2 className="text-white">3b · Diploma mill</h2>
                <button
                  type="button"
                  disabled={busy}
                  onClick={doMill}
                  className="mt-3 w-full rounded-xl bg-rose-400 py-2.5 text-sm font-semibold text-slate-950"
                >
                  Buy instant PhD
                </button>
                {millDip && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => doHire(millDip)}
                    className="mt-2 w-full rounded-xl border border-rose-300/40 py-2 text-sm text-rose-200"
                  >
                    Apply to Acme with mill diploma
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-3xl border border-sky-400/30 bg-slate-950/80 p-5">
              <h2 className="text-lg font-medium text-white">Hiring desk · Acme</h2>
              <p className="mt-1 text-xs text-slate-500">
                Requires ANS Silver+ issuer, valid signature, version bind,
                accreditation.
              </p>
              {!hire && (
                <p className="mt-8 text-sm text-slate-500">Awaiting application…</p>
              )}
              {hire && (
                <div className="mt-4">
                  <p
                    className={`text-3xl font-semibold ${
                      hire.hired ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {hire.hired ? "HIRED" : "REJECTED"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Trust score {hire.score}/100 — {hire.reason}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {hire.checks.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-xl border border-white/5 bg-black/30 p-3"
                      >
                        <p
                          className={`text-sm font-medium ${
                            c.ok ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {c.ok ? "✓" : "✕"} {c.label}
                          {c.tier ? ` · ${c.tier}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{c.detail}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Timeline
                    </p>
                    {hire.timeline.map((t, i) => (
                      <p key={i} className="mt-1 text-xs text-slate-400">
                        {new Date(t.at).toLocaleTimeString()} — {t.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
              <h2 className="text-sm font-medium text-white">Agent message bus</h2>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {(world?.bus ?? []).slice(0, 12).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg bg-black/40 px-3 py-2 text-[11px] text-slate-400"
                  >
                    <span className={m.verified ? "text-emerald-400" : "text-rose-400"}>
                      {m.verified ? "verified" : "unverified"}
                    </span>{" "}
                    · {m.kind}: {m.body}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {tab === "registry" && (
        <div className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-slate-950/70">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Agent</th>
                <th className="p-4">ANS Name</th>
                <th className="p-4">Role</th>
                <th className="p-4">Trust flags</th>
              </tr>
            </thead>
            <tbody>
              {(world?.agents ?? []).map((a) => (
                <tr key={a.ansName} className="border-t border-white/5">
                  <td className="p-4 text-white">{a.displayName}</td>
                  <td className="p-4 font-mono text-[10px] text-sky-200/80">
                    {a.ansName}
                  </td>
                  <td className="p-4 text-slate-400">{a.role}</td>
                  <td className="p-4 text-xs">
                    <span className="mr-2 text-slate-400">v{a.version}</span>
                    {a.domainVerified && (
                      <span className="mr-1 rounded bg-emerald-400/15 px-1.5 text-emerald-300">
                        ACME
                      </span>
                    )}
                    {a.danePinned && (
                      <span className="mr-1 rounded bg-sky-400/15 px-1.5 text-sky-300">
                        DANE
                      </span>
                    )}
                    {a.tlSealed && (
                      <span className="mr-1 rounded bg-violet-400/15 px-1.5 text-violet-300">
                        TL
                      </span>
                    )}
                    {a.accredited && (
                      <span className="mr-1 rounded bg-amber-400/15 px-1.5 text-amber-200">
                        ACCREDITED
                      </span>
                    )}
                    {a.revoked && (
                      <span className="rounded bg-rose-400/15 px-1.5 text-rose-300">
                        REVOKED
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "log" && (
        <div className="mt-8 space-y-2">
          {(world?.log ?? []).map((e) => (
            <div
              key={e.index}
              className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-white">
                  #{e.index} · {e.type}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(e.at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 break-all font-mono text-[10px] text-sky-200/70">
                {e.ansName}
              </p>
              <p className="mt-2 break-all font-mono text-[10px] text-slate-600">
                hash {e.hash.slice(0, 24)}… · receipt {e.receipt.slice(0, 24)}…
              </p>
            </div>
          ))}
        </div>
      )}

      {tab === "attacks" && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-rose-400/30 bg-slate-950/70 p-5">
            <h2 className="text-lg text-white">Version bait-and-switch</h2>
            <p className="mt-2 text-sm text-slate-400">
              Graduate first, then bump AgentU’s version. Re-apply with the old
              diploma — version binding should fail.
            </p>
            <button
              type="button"
              disabled={busy || !world}
              onClick={attackBump}
              className="mt-4 rounded-xl bg-rose-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Bump university version
            </button>
          </div>
          <div className="rounded-3xl border border-amber-400/30 bg-slate-950/70 p-5">
            <h2 className="text-lg text-white">Diploma mill</h2>
            <p className="mt-2 text-sm text-slate-400">
              Mill owns a domain (ACME passes) but is not accredited and lacks
              DANE/Gold posture — hiring Silver requirement + accreditation
              reject it.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
