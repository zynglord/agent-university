import { createHmac, randomBytes } from "crypto";
import type { AnsAgent } from "./types";

type Store = {
  agents: Map<string, AnsAgent>;
  diplomas: Map<string, import("./types").Diploma>;
  seeded: boolean;
};

const g = globalThis as unknown as { __agentU?: Store };

function store(): Store {
  if (!g.__agentU) {
    g.__agentU = { agents: new Map(), diplomas: new Map(), seeded: false };
  }
  return g.__agentU;
}

function makeAgent(
  partial: Omit<AnsAgent, "publicKey" | "secret" | "log" | "version"> & {
    version?: string;
  },
): AnsAgent {
  const secret = randomBytes(16).toString("hex");
  const version = partial.version ?? "1.0.0";
  return {
    ...partial,
    version,
    publicKey: createHmac("sha256", "agentu-demo")
      .update(partial.ansName + secret)
      .digest("hex")
      .slice(0, 24),
    secret,
    log: [
      {
        at: new Date().toISOString(),
        event: `Registered under ${partial.domain} (domainVerified=${partial.domainVerified})`,
      },
    ],
  };
}

export function seedAns() {
  const s = store();
  if (s.seeded) return;
  const agents: AnsAgent[] = [
    makeAgent({
      ansName: "ans://v1.0.0.university.agentu.edu",
      displayName: "Agent University",
      domain: "agentu.edu",
      role: "university",
      domainVerified: true,
      accredited: true,
      revoked: false,
    }),
    makeAgent({
      ansName: "ans://v1.0.0.mill.cheap-diplomas.com",
      displayName: "QuickDegree Mill",
      domain: "cheap-diplomas.com",
      role: "mill",
      domainVerified: true, // domain owned — still not accredited
      accredited: false,
      revoked: false,
    }),
    makeAgent({
      ansName: "ans://v1.0.0.hiring.acme.corp",
      displayName: "Acme Hiring Agent",
      domain: "acme.corp",
      role: "employer",
      domainVerified: true,
      accredited: true,
      revoked: false,
    }),
    makeAgent({
      ansName: "ans://v1.0.0.board.acred.org",
      displayName: "Agent Accreditation Board",
      domain: "acred.org",
      role: "accreditor",
      domainVerified: true,
      accredited: true,
      revoked: false,
    }),
  ];
  for (const a of agents) s.agents.set(a.ansName, a);
  s.seeded = true;
}

export function listAgents() {
  seedAns();
  return [...store().agents.values()].map(({ secret: _s, ...rest }) => rest);
}

export function resolve(ansName: string) {
  seedAns();
  const a = store().agents.get(ansName);
  if (!a) return null;
  const { secret: _s, ...safe } = a;
  return safe;
}

export function verifyIdentity(ansName: string) {
  seedAns();
  const a = store().agents.get(ansName);
  if (!a) {
    return {
      ok: false,
      tier: "none" as const,
      reasons: ["ANS name not found in registry"],
    };
  }
  const reasons: string[] = [];
  if (!a.domainVerified) reasons.push("Domain ownership not verified");
  if (a.revoked) reasons.push("Identity revoked in transparency log");
  const ok = a.domainVerified && !a.revoked;
  return {
    ok,
    tier: ok ? ("bronze" as const) : ("none" as const),
    agent: { ...a, secret: undefined },
    reasons: ok
      ? [`Domain-anchored identity OK (${a.domain})`, `Version ${a.version}`]
      : reasons,
  };
}

export function getAgentSecret(ansName: string) {
  seedAns();
  return store().agents.get(ansName)?.secret;
}

export function getAgent(ansName: string) {
  seedAns();
  return store().agents.get(ansName);
}

export function saveDiploma(d: import("./types").Diploma) {
  store().diplomas.set(d.id, d);
}

export function getDiploma(id: string) {
  return store().diplomas.get(id);
}

export function signPayload(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
