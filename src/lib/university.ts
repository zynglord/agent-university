import { randomUUID } from "crypto";
import { getAgent, registerAgent, verifyDomainAcme, verifyIdentity } from "./ans";
import { appendLog, pushBus, sign, world } from "./store";
import { constants, seedUniverse } from "./seed";
import type { CreditRecord, Diploma, Enrollment, HireResult, StudentProfile } from "./types";

export function ensureStudent(displayName: string): StudentProfile {
  seedUniverse();
  const w = world();
  const label = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "student";
  const existing = [...w.students.values()].find(
    (s) => s.displayName.toLowerCase() === displayName.toLowerCase(),
  );
  if (existing) return existing;

  const agent = registerAgent({
    displayName,
    domain: "students.dev",
    role: "student",
    label,
    capabilities: ["learn", "apply"],
    danePinned: true,
  });
  verifyDomainAcme(agent.ansName, "PASS");

  const student: StudentProfile = {
    ansName: agent.ansName,
    displayName,
    enrolledCourseIds: [],
    credits: [],
  };
  w.students.set(student.ansName, student);
  return student;
}

export function listCourses() {
  seedUniverse();
  return [...world().courses.values()];
}

export function enroll(studentAns: string, courseId: string) {
  seedUniverse();
  const w = world();
  const course = w.courses.get(courseId);
  const student = w.students.get(studentAns);
  if (!course || !student) throw new Error("Unknown student or course");

  // verify professor + optional guest via ANS before enrollment message
  const profCheck = verifyIdentity(course.professorAns, "bronze");
  if (!profCheck.ok) throw new Error("Professor identity failed ANS verify");
  if (course.guestLecturerAns) {
    const g = verifyIdentity(course.guestLecturerAns, "bronze");
    if (!g.ok) throw new Error("Guest lecturer failed ANS verify");
    appendLog("GUEST_LECTURE", course.guestLecturerAns, {
      courseId,
      host: course.universityAns,
    });
  }

  if (!student.enrolledCourseIds.includes(courseId)) {
    student.enrolledCourseIds.push(courseId);
  }
  student.homeUniversityAns ??= course.universityAns;
  const enrollment: Enrollment = {
    studentAns,
    courseId,
    status: "enrolled",
  };
  w.enrollments.push(enrollment);
  pushBus(studentAns, course.universityAns, "ENROLL", `Enrolled in ${course.code}`, true);
  return enrollment;
}

export function completeCourse(studentAns: string, courseId: string, grade = "A") {
  seedUniverse();
  const w = world();
  const course = w.courses.get(courseId);
  const student = w.students.get(studentAns);
  if (!course || !student) throw new Error("Unknown student or course");

  const enr = w.enrollments.find(
    (e) => e.studentAns === studentAns && e.courseId === courseId && e.status === "enrolled",
  );
  if (enr) {
    enr.status = "completed";
    enr.grade = grade;
    enr.completedAt = new Date().toISOString();
  }

  const credit: CreditRecord = {
    id: randomUUID(),
    studentAns,
    courseId,
    courseCode: course.code,
    title: course.title,
    credits: course.credits,
    fromUniversityAns: course.universityAns,
    transferStatus: "native",
  };
  student.credits.push(credit);
  w.credits.push(credit);
  pushBus(course.professorAns, studentAns, "GRADE", `${course.code} → ${grade}`, true);
  return credit;
}

export function requestTransfer(
  studentAns: string,
  creditId: string,
  toUniversityAns: string,
) {
  seedUniverse();
  const w = world();
  const student = w.students.get(studentAns);
  const credit = student?.credits.find((c) => c.id === creditId);
  if (!student || !credit) throw new Error("Credit not found");

  const fromOk = verifyIdentity(credit.fromUniversityAns, "bronze");
  const toOk = verifyIdentity(toUniversityAns, "bronze");
  if (!fromOk.ok || !toOk.ok) throw new Error("Transfer blocked: ANS verify failed");

  credit.transferStatus = "pending";
  credit.acceptedByUniversityAns = toUniversityAns;
  appendLog("TRANSFER_CREDIT", studentAns, {
    creditId,
    from: credit.fromUniversityAns,
    to: toUniversityAns,
  });

  // Auto-accept if both accredited
  const from = getAgent(credit.fromUniversityAns);
  const to = getAgent(toUniversityAns);
  if (from?.accredited && to?.accredited) {
    credit.transferStatus = "accepted";
    pushBus(toUniversityAns, studentAns, "TRANSFER_ACCEPT", credit.courseCode, true);
  } else {
    credit.transferStatus = "rejected";
    pushBus(toUniversityAns, studentAns, "TRANSFER_REJECT", credit.courseCode, true);
  }
  return credit;
}

function diplomaPayload(d: Omit<Diploma, "signature">) {
  return [
    d.id,
    d.studentAns,
    d.issuerAns,
    d.program,
    d.totalCredits,
    d.issuerVersion,
    d.issuedAt,
    d.courses.map((c) => c.code).join(","),
  ].join("|");
}

export function graduate(studentAns: string, issuerAns: string, program: string) {
  seedUniverse();
  const w = world();
  const ids = constants();
  const student = w.students.get(studentAns);
  const issuer = getAgent(issuerAns);
  if (!student || !issuer) throw new Error("Unknown student/issuer");

  const secret = issuer.secret;
  const nativeCredits = student.credits.filter(
    (c) =>
      c.fromUniversityAns === issuerAns ||
      (c.transferStatus === "accepted" && c.acceptedByUniversityAns === issuerAns),
  );

  // Mill path: allow zero credits
  const isMill = issuer.role === "mill";
  if (!isMill && nativeCredits.reduce((s, c) => s + c.credits, 0) < 6) {
    throw new Error("Need at least 6 credits at this university (or accepted transfers)");
  }

  const courses = isMill
    ? [{ code: "NONE", title: "No coursework", credits: 0, grade: "N/A" }]
    : nativeCredits.map((c) => ({
        code: c.courseCode,
        title: c.title,
        credits: c.credits,
        grade: "A",
      }));

  const base: Omit<Diploma, "signature"> = {
    id: randomUUID(),
    studentName: student.displayName,
    studentAns,
    issuerAns,
    issuerDomain: issuer.domain,
    program,
    courses,
    totalCredits: courses.reduce((s, c) => s + c.credits, 0),
    issuedAt: new Date().toISOString(),
    issuerVersion: issuer.version,
    chain: {
      accreditorAns: issuer.accreditedBy ?? ids.board,
      universityAns: issuerAns,
      professorAns: ids.prof,
    },
  };

  const logEvent = appendLog("DIPLOMA_ISSUE", issuerAns, {
    studentAns,
    program,
    credits: base.totalCredits,
  });
  base.logReceipt = logEvent.receipt;

  const diploma: Diploma = {
    ...base,
    signature: sign(secret, diplomaPayload(base)),
  };
  w.diplomas.set(diploma.id, diploma);
  pushBus(issuerAns, studentAns, "DIPLOMA", program, true);
  return diploma;
}

export function issueMillDiploma(studentName: string) {
  const student = ensureStudent(studentName);
  const { mill } = constants();
  return graduate(student.ansName, mill, "Instant PhD (no classes)");
}

export function evaluateHire(diploma: Diploma, requiredTier: "bronze" | "silver" | "gold" = "silver"): HireResult {
  seedUniverse();
  const timeline: HireResult["timeline"] = [];
  const push = (label: string) =>
    timeline.push({ at: new Date().toISOString(), label });

  push("Received application + diploma artifact");
  const checks: HireResult["checks"] = [];

  const identity = verifyIdentity(diploma.issuerAns, requiredTier);
  checks.push({
    id: "ans-verify",
    label: `ANS verify issuer (need ${requiredTier})`,
    ok: identity.ok,
    detail: identity.reasons.join(" · "),
    tier: identity.tier,
  });
  push(`ANS verify → ${identity.ok ? identity.tier : "FAIL"}`);

  const issuer = getAgent(diploma.issuerAns);
  const expected =
    issuer &&
    sign(
      issuer.secret,
      diplomaPayload({
        id: diploma.id,
        studentName: diploma.studentName,
        studentAns: diploma.studentAns,
        issuerAns: diploma.issuerAns,
        issuerDomain: diploma.issuerDomain,
        program: diploma.program,
        courses: diploma.courses,
        totalCredits: diploma.totalCredits,
        issuedAt: diploma.issuedAt,
        issuerVersion: diploma.issuerVersion,
        chain: diploma.chain,
        logReceipt: diploma.logReceipt,
      }),
    );

  const sigOk = Boolean(expected && expected === diploma.signature);
  checks.push({
    id: "signature",
    label: "Diploma signature binds to issuer key",
    ok: sigOk,
    detail: sigOk ? "HMAC valid" : "Signature mismatch or unknown issuer key",
  });
  push(`Signature check → ${sigOk ? "OK" : "FAIL"}`);

  const versionOk = issuer?.version === diploma.issuerVersion && !issuer?.revoked;
  checks.push({
    id: "version-bind",
    label: "Issuer version matches diploma binding",
    ok: Boolean(versionOk),
    detail: versionOk
      ? `Bound to v${diploma.issuerVersion}`
      : `Diploma version ${diploma.issuerVersion} ≠ live ${issuer?.version ?? "?"} (possible bait-and-switch)`,
  });

  const accredited = Boolean(issuer?.accredited);
  checks.push({
    id: "accredited",
    label: "Issuer accredited by trust board",
    ok: accredited,
    detail: accredited
      ? `Accredited by ${issuer?.accreditedBy ?? "board"}`
      : "Not accredited — diploma mill pattern",
  });
  push(`Accreditation → ${accredited ? "OK" : "FAIL"}`);

  if (diploma.chain.accreditorAns) {
    const board = verifyIdentity(diploma.chain.accreditorAns, "bronze");
    checks.push({
      id: "chain-accreditor",
      label: "Accreditation chain ANS verify",
      ok: board.ok,
      detail: board.reasons.join(" · "),
    });
  }

  const creditOk = diploma.totalCredits >= 6 || Boolean(issuer?.role === "mill");
  // mill may have 0 credits — still fails accredited
  checks.push({
    id: "credits",
    label: "Curriculum substance",
    ok: issuer?.role === "mill" ? false : diploma.totalCredits >= 6,
    detail:
      issuer?.role === "mill"
        ? "Zero coursework (mill)"
        : `${diploma.totalCredits} credits on diploma`,
  });

  appendLog("HIRE_CHECK", constants().employer, {
    diplomaId: diploma.id,
    issuer: diploma.issuerAns,
  });

  const critical = ["ans-verify", "signature", "version-bind", "accredited"] as const;
  const hired = critical.every((id) => checks.find((c) => c.id === id)?.ok);
  const score = Math.round(
    (checks.filter((c) => c.ok).length / checks.length) * 100,
  );

  push(hired ? "Offer extended" : "Application rejected");

  return {
    hired,
    score,
    reason: hired
      ? "ANS-verified accredited issuer + valid bound diploma"
      : "Failed one or more identity / accreditation checks",
    checks,
    timeline,
  };
}

export function getStudent(ansName: string) {
  seedUniverse();
  return world().students.get(ansName) ?? null;
}

export function listStudents() {
  seedUniverse();
  return [...world().students.values()];
}

export function listDiplomas() {
  return [...world().diplomas.values()];
}

export function getDiploma(id: string) {
  return world().diplomas.get(id);
}

export function getLog() {
  seedUniverse();
  return world().log;
}

export function getBus() {
  seedUniverse();
  return world().bus;
}

export function snapshot() {
  seedUniverse();
  const w = world();
  return {
    agents: [...w.agents.values()].map(({ secret: _s, ...a }) => a),
    courses: [...w.courses.values()],
    students: [...w.students.values()],
    diplomas: [...w.diplomas.values()],
    log: w.log.slice().reverse(),
    bus: w.bus,
    constants: constants(),
  };
}
