import {
  appendLog,
  makeKeyPair,
  publicAgent,
  pushBus,
  sign,
  world,
} from "./store";
import type { AnsAgent, AgentRole, TrustTier } from "./types";

export function registerAgent(input: {
  displayName: string;
  domain: string;
  role: AgentRole;
  label: string;
  version?: string;
  capabilities?: string[];
  accredited?: boolean;
  accreditedBy?: string;
  danePinned?: boolean;
}): AnsAgent {
  const w = world();
  const version = input.version ?? "1.0.0";
  const ansName = `ans://v${version}.${input.label}.${input.domain}`;
  if (w.agents.has(ansName)) return w.agents.get(ansName)!;

  const { secret, publicKey } = makeKeyPair(ansName);
  const agent: AnsAgent = {
    ansName,
    displayName: input.displayName,
    domain: input.domain,
    role: input.role,
    version,
    domainVerified: false,
    danePinned: Boolean(input.danePinned),
    tlSealed: false,
    accredited: Boolean(input.accredited),
    accreditedBy: input.accreditedBy,
    revoked: false,
    capabilities: input.capabilities ?? [],
    publicKey,
    secret,
    createdAt: new Date().toISOString(),
    endpoint: `https://agents.${input.domain}/${input.label}`,
  };
  w.agents.set(ansName, agent);
  appendLog("REGISTER", ansName, {
    domain: input.domain,
    role: input.role,
    version,
  });
  return agent;
}

/** Mock ACME domain ownership challenge */
export function verifyDomainAcme(ansName: string, token: string) {
  const w = world();
  const agent = w.agents.get(ansName);
  if (!agent) throw new Error("Unknown agent");

  // Demo rule: token must equal sha-ish of domain (predictable for UI)
  const expected = sign("acme-demo", agent.domain).slice(0, 12);
  const ok = token === expected || token === "PASS";
  if (!ok) {
    appendLog("ACME_FAIL", ansName, { token });
    throw new Error(`ACME challenge failed for ${agent.domain}`);
  }
  agent.domainVerified = true;
  appendLog("ACME_PASS", ansName, { domain: agent.domain });
  appendLog("ISSUE_IDENTITY_CERT", ansName, {
    publicKey: agent.publicKey,
    version: agent.version,
  });
  agent.tlSealed = true;
  pushBus(
    "ans://v1.0.0.ra.registry.local",
    ansName,
    "IDENTITY_ISSUED",
    `Identity cert issued for ${agent.ansName}`,
    true,
  );
  return publicAgent(agent);
}

export function expectedAcmeToken(domain: string) {
  return sign("acme-demo", domain).slice(0, 12);
}

export function bumpVersion(ansName: string) {
  const w = world();
  const old = w.agents.get(ansName);
  if (!old) throw new Error("Unknown agent");
  const [major, minor, patch] = old.version.split(".").map(Number);
  const version = `${major}.${minor}.${patch + 1}`;
  const label = old.ansName.split(".")[1] ?? "agent";
  // ans://v1.0.0.label.domain.tld — parse carefully
  const withoutScheme = old.ansName.replace("ans://v", "");
  const parts = withoutScheme.split(".");
  // vX.Y.Z.label.rest...
  const labelIdx = 3;
  const agentLabel = parts[labelIdx];
  const domain = parts.slice(labelIdx + 1).join(".");
  const newName = `ans://v${version}.${agentLabel}.${domain}`;
  const { secret, publicKey } = makeKeyPair(newName);
  const next: AnsAgent = {
    ...old,
    ansName: newName,
    version,
    publicKey,
    secret,
    tlSealed: true,
  };
  w.agents.set(newName, next);
  // keep old name as revoked pointer for demo of version swap attack
  old.revoked = true;
  old.revokedReason = `Superseded by ${newName}`;
  appendLog("VERSION_BUMP", newName, {
    from: ansName,
    to: newName,
    version,
  });
  appendLog("REVOKE", ansName, { reason: old.revokedReason });
  return publicAgent(next);
}

export function revoke(ansName: string, reason: string) {
  const agent = world().agents.get(ansName);
  if (!agent) throw new Error("Unknown agent");
  agent.revoked = true;
  agent.revokedReason = reason;
  appendLog("REVOKE", ansName, { reason });
  return publicAgent(agent);
}

export function accredit(universityAns: string, accreditorAns: string) {
  const w = world();
  const uni = w.agents.get(universityAns);
  const board = w.agents.get(accreditorAns);
  if (!uni || !board) throw new Error("Unknown agents");
  if (board.role !== "accreditor") throw new Error("Not an accreditor");
  uni.accredited = true;
  uni.accreditedBy = accreditorAns;
  appendLog("ACCREDIT", universityAns, { by: accreditorAns });
  pushBus(accreditorAns, universityAns, "ACCREDIT", "Accreditation granted", true);
  return publicAgent(uni);
}

export function resolve(ansName: string) {
  const a = world().agents.get(ansName);
  return a ? publicAgent(a) : null;
}

export function listAgents() {
  return [...world().agents.values()].map(publicAgent);
}

export function verifyIdentity(
  ansName: string,
  required: TrustTier = "bronze",
): {
  ok: boolean;
  tier: TrustTier;
  reasons: string[];
  agent: ReturnType<typeof publicAgent> | null;
} {
  const agent = world().agents.get(ansName);
  if (!agent) {
    return { ok: false, tier: "none", reasons: ["ANS name not registered"], agent: null };
  }
  const reasons: string[] = [];
  let tier: TrustTier = "none";

  if (!agent.domainVerified) reasons.push("Domain ownership not verified (ACME)");
  else {
    tier = "bronze";
    reasons.push(`Bronze: domain-anchored PKI for ${agent.domain}`);
  }

  if (tier !== "none" && agent.danePinned) {
    tier = "silver";
    reasons.push("Silver: DANE/TLSA pin matched");
  } else if (required === "silver" || required === "gold") {
    if (!agent.danePinned) reasons.push("Missing DANE pin for Silver+");
  }

  if (tier !== "none" && agent.tlSealed && !agent.revoked) {
    if (agent.danePinned || tier === "bronze") {
      if (agent.tlSealed && agent.danePinned) {
        tier = "gold";
        reasons.push("Gold: sealed in transparency log");
      } else if (agent.tlSealed) {
        reasons.push("TL sealed (upgrade to Gold with DANE)");
      }
    }
  }

  if (agent.revoked) {
    return {
      ok: false,
      tier: "none",
      reasons: [`Revoked: ${agent.revokedReason ?? "revoked"}`],
      agent: publicAgent(agent),
    };
  }

  const order: TrustTier[] = ["none", "bronze", "silver", "gold"];
  const ok =
    agent.domainVerified &&
    !agent.revoked &&
    order.indexOf(tier) >= order.indexOf(required);

  if (!ok && agent.domainVerified && !agent.revoked) {
    reasons.push(`Required tier ${required} not met (have ${tier})`);
  }

  return { ok, tier: agent.domainVerified && !agent.revoked ? tier : "none", reasons, agent: publicAgent(agent) };
}

export function getSecret(ansName: string) {
  return world().agents.get(ansName)?.secret;
}

export function getAgent(ansName: string) {
  return world().agents.get(ansName);
}
