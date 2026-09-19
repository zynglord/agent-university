import {
  accredit,
  registerAgent,
  verifyDomainAcme,
} from "./ans";
import { world } from "./store";
import type { Course } from "./types";

export function seedUniverse() {
  const w = world();
  if (w.seeded) return;

  const ra = registerAgent({
    displayName: "ANS Registration Authority",
    domain: "registry.local",
    role: "registrar",
    label: "ra",
    capabilities: ["register", "acme", "issue-cert"],
    danePinned: true,
  });
  verifyDomainAcme(ra.ansName, "PASS");

  const board = registerAgent({
    displayName: "Agent Accreditation Board",
    domain: "acred.org",
    role: "accreditor",
    label: "board",
    capabilities: ["accredit"],
    danePinned: true,
    accredited: true,
  });
  verifyDomainAcme(board.ansName, "PASS");

  const uni = registerAgent({
    displayName: "Agent University",
    domain: "agentu.edu",
    role: "university",
    label: "university",
    capabilities: ["enroll", "graduate", "transfer"],
    danePinned: true,
  });
  verifyDomainAcme(uni.ansName, "PASS");
  accredit(uni.ansName, board.ansName);

  const poly = registerAgent({
    displayName: "PolyAgent Tech",
    domain: "polyagent.edu",
    role: "university",
    label: "campus",
    capabilities: ["enroll", "graduate", "transfer"],
    danePinned: true,
  });
  verifyDomainAcme(poly.ansName, "PASS");
  accredit(poly.ansName, board.ansName);

  const mill = registerAgent({
    displayName: "QuickDegree Mill",
    domain: "cheap-diplomas.com",
    role: "mill",
    label: "mill",
    capabilities: ["instant-diploma"],
    danePinned: false,
    accredited: false,
  });
  verifyDomainAcme(mill.ansName, "PASS"); // owns domain — still unaccredited

  const prof = registerAgent({
    displayName: "Prof. Ada Systems",
    domain: "agentu.edu",
    role: "professor",
    label: "prof-ada",
    capabilities: ["teach", "grade"],
    danePinned: true,
    accredited: true,
    accreditedBy: board.ansName,
  });
  verifyDomainAcme(prof.ansName, "PASS");

  const guest = registerAgent({
    displayName: "Stripe Payments Guest Lecturer",
    domain: "stripe.com",
    role: "professor",
    label: "guest-payments",
    capabilities: ["teach-payments"],
    danePinned: true,
  });
  verifyDomainAcme(guest.ansName, "PASS");

  const employer = registerAgent({
    displayName: "Acme Hiring Agent",
    domain: "acme.corp",
    role: "employer",
    label: "hiring",
    capabilities: ["hire", "verify-diploma"],
    danePinned: true,
    accredited: true,
  });
  verifyDomainAcme(employer.ansName, "PASS");

  const courses: Course[] = [
    {
      id: "c-ans-101",
      code: "ANS-101",
      title: "Identity & Trust for Agents",
      credits: 3,
      universityAns: uni.ansName,
      professorAns: prof.ansName,
      description: "Domain-anchored identity, verification tiers, transparency logs.",
    },
    {
      id: "c-a2a-201",
      code: "A2A-201",
      title: "Agent-to-Agent Protocols",
      credits: 4,
      universityAns: uni.ansName,
      professorAns: prof.ansName,
      guestLecturerAns: guest.ansName,
      description: "Discovery, capability ads, and verified negotiation.",
    },
    {
      id: "c-sec-310",
      code: "SEC-310",
      title: "Impostor Resistance",
      credits: 3,
      universityAns: uni.ansName,
      professorAns: prof.ansName,
      description: "Revocation, version binding, diploma-mill attacks.",
    },
    {
      id: "c-pay-180",
      code: "PAY-180",
      title: "Payment Rails for Agents",
      credits: 2,
      universityAns: poly.ansName,
      professorAns: guest.ansName,
      description: "Guest-taught module at PolyAgent Tech.",
    },
  ];
  for (const c of courses) w.courses.set(c.id, c);

  w.seeded = true;
}

export function constants() {
  seedUniverse();
  const w = world();
  const find = (pred: (a: { role: string; domain: string; ansName: string }) => boolean) =>
    [...w.agents.values()].find(pred)!;
  return {
    uni: find((a) => a.role === "university" && a.domain === "agentu.edu").ansName,
    poly: find((a) => a.role === "university" && a.domain === "polyagent.edu").ansName,
    mill: find((a) => a.role === "mill").ansName,
    board: find((a) => a.role === "accreditor").ansName,
    employer: find((a) => a.role === "employer").ansName,
    prof: find((a) => a.ansName.includes("prof-ada")).ansName,
    guest: find((a) => a.ansName.includes("guest-payments")).ansName,
    ra: find((a) => a.role === "registrar").ansName,
  };
}
