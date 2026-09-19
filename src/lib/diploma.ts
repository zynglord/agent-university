import { randomUUID } from "crypto";
import {
  getAgent,
  getAgentSecret,
  saveDiploma,
  signPayload,
  verifyIdentity,
} from "./ans";
import type { Diploma, HireResult } from "./types";

function diplomaPayload(d: Omit<Diploma, "signature" | "id"> & { id: string }) {
  return [
    d.id,
    d.studentName,
    d.studentAns,
    d.issuerAns,
    d.program,
    d.issuedAt,
  ].join("|");
}

export function issueDiploma(input: {
  studentName: string;
  issuerAns: string;
  program: string;
}): Diploma {
  const issuer = getAgent(input.issuerAns);
  const secret = getAgentSecret(input.issuerAns);
  if (!issuer || !secret) throw new Error("Unknown issuer");

  const studentAns = `ans://v1.0.0.student.${input.studentName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}.agents.dev`;

  const base = {
    id: randomUUID(),
    studentName: input.studentName,
    studentAns,
    issuerAns: issuer.ansName,
    issuerDomain: issuer.domain,
    program: input.program,
    issuedAt: new Date().toISOString(),
  };
  const signature = signPayload(secret, diplomaPayload(base));
  const diploma: Diploma = { ...base, signature };
  saveDiploma(diploma);
  return diploma;
}

export function evaluateHire(diploma: Diploma): HireResult {
  const checks: HireResult["checks"] = [];

  const identity = verifyIdentity(diploma.issuerAns);
  checks.push({
    label: "ANS resolve + verify issuer",
    ok: identity.ok,
    detail: identity.reasons.join("; "),
  });

  const issuer = getAgent(diploma.issuerAns);
  const secret = getAgentSecret(diploma.issuerAns);
  const expected =
    secret &&
    signPayload(
      secret,
      diplomaPayload({
        id: diploma.id,
        studentName: diploma.studentName,
        studentAns: diploma.studentAns,
        issuerAns: diploma.issuerAns,
        issuerDomain: diploma.issuerDomain,
        program: diploma.program,
        issuedAt: diploma.issuedAt,
      }),
    );

  const sigOk = Boolean(expected && expected === diploma.signature);
  checks.push({
    label: "Diploma signature matches issuer key",
    ok: sigOk,
    detail: sigOk ? "HMAC valid for registered issuer" : "Signature mismatch / unknown issuer",
  });

  const accredited = Boolean(issuer?.accredited);
  checks.push({
    label: "Issuer accredited (not a diploma mill)",
    ok: accredited,
    detail: accredited
      ? `${issuer?.displayName} is accredited`
      : `${issuer?.displayName ?? "Issuer"} is NOT accredited — diploma mill pattern`,
  });

  const hired = checks.every((c) => c.ok);
  return {
    hired,
    reason: hired
      ? "Offer extended — issuer identity verified via ANS"
      : "Rejected — failed ANS / accreditation checks",
    checks,
  };
}
