"use client";

import { useEffect, useState } from "react";
import type { Diploma, HireResult } from "@/lib/types";

const UNI = "ans://v1.0.0.university.agentu.edu";
const MILL = "ans://v1.0.0.mill.cheap-diplomas.com";

export default function Home() {
  const [name, setName] = useState("Nova");
  const [uniDiploma, setUniDiploma] = useState<Diploma | null>(null);
  const [millDiploma, setMillDiploma] = useState<Diploma | null>(null);
  const [active, setActive] = useState<"uni" | "mill" | null>(null);
  const [hire, setHire] = useState<HireResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/agents");
  }, []);

  async function graduate(kind: "uni" | "mill") {
    setBusy(true);
    setError(null);
    setHire(null);
    try {
      const res = await fetch("/api/diploma/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: name || "Student",
          issuerAns: kind === "uni" ? UNI : MILL,
          program:
            kind === "uni"
              ? "B.S. Autonomous Systems"
              : "Instant PhD (no classes)",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      if (kind === "uni") setUniDiploma(json.diploma);
      else setMillDiploma(json.diploma);
      setActive(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function apply(diploma: Diploma, kind: "uni" | "mill") {
    setBusy(true);
    setActive(kind);
    setError(null);
    try {
      const res = await fetch("/api/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diploma }),
      });
      setHire(await res.json());
    } catch {
      setError("Hire check failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-sky-300/80">
          VTHacks · Best use of ANS
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
          Agent University
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Agents earn diplomas. Hiring agents only accept credentials whose{" "}
          <span className="text-sky-200">issuer ANS identity</span> verifies —
          diploma mills fail even if they look legit.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-400">
          Student agent name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Real uni */}
        <section className="rounded-3xl border border-emerald-400/30 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-wider text-emerald-300">
            Accredited university
          </p>
          <h2 className="mt-1 text-lg font-medium text-white">AgentU</h2>
          <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
            {UNI}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => graduate("uni")}
            className="mt-4 w-full rounded-xl bg-emerald-400 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Graduate here
          </button>
          {uniDiploma && (
            <div className="mt-4 rounded-xl bg-black/40 p-3 text-xs text-slate-300">
              <p className="font-medium text-white">{uniDiploma.program}</p>
              <p className="mt-1">Issuer: {uniDiploma.issuerDomain}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => apply(uniDiploma, "uni")}
                className="mt-3 w-full rounded-lg border border-emerald-400/40 py-2 text-emerald-200"
              >
                Apply to Acme with this diploma
              </button>
            </div>
          )}
        </section>

        {/* Mill */}
        <section className="rounded-3xl border border-rose-400/30 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-wider text-rose-300">
            Diploma mill
          </p>
          <h2 className="mt-1 text-lg font-medium text-white">QuickDegree</h2>
          <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
            {MILL}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => graduate("mill")}
            className="mt-4 w-full rounded-xl bg-rose-400 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            Buy instant diploma
          </button>
          {millDiploma && (
            <div className="mt-4 rounded-xl bg-black/40 p-3 text-xs text-slate-300">
              <p className="font-medium text-white">{millDiploma.program}</p>
              <p className="mt-1">Issuer: {millDiploma.issuerDomain}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => apply(millDiploma, "mill")}
                className="mt-3 w-full rounded-lg border border-rose-400/40 py-2 text-rose-200"
              >
                Apply to Acme with this diploma
              </button>
            </div>
          )}
        </section>

        {/* Hiring */}
        <section className="rounded-3xl border border-sky-400/30 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-wider text-sky-300">
            Employer agent
          </p>
          <h2 className="mt-1 text-lg font-medium text-white">Acme Hiring</h2>
          <p className="mt-1 break-all font-mono text-[10px] text-slate-500">
            ans://v1.0.0.hiring.acme.corp
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Verifies issuer via ANS, checks signature + accreditation.
          </p>

          {!hire && (
            <p className="mt-6 text-sm text-slate-500">
              Pick a diploma and apply →
            </p>
          )}

          {hire && (
            <div
              className={`mt-4 rounded-xl p-4 ${
                hire.hired
                  ? "border border-emerald-400/40 bg-emerald-400/10"
                  : "border border-rose-400/40 bg-rose-400/10"
              }`}
            >
              <p className="text-lg font-semibold text-white">
                {hire.hired ? "HIRED ✓" : "REJECTED ✕"}
              </p>
              <p className="mt-1 text-sm text-slate-300">{hire.reason}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                Applied with: {active === "uni" ? "AgentU" : "QuickDegree"}
              </p>
              <ul className="mt-3 space-y-2">
                {hire.checks.map((c) => (
                  <li key={c.label} className="text-xs">
                    <span className={c.ok ? "text-emerald-300" : "text-rose-300"}>
                      {c.ok ? "✓" : "✕"} {c.label}
                    </span>
                    <p className="text-slate-500">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

      <p className="mt-8 text-center text-xs text-slate-600">
        Demo ANS registry (domain-anchored names + verify). Production would use
        real ANS RA / transparency log.
      </p>
    </main>
  );
}
