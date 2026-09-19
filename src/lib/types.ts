export type AgentRole =
  | "university"
  | "mill"
  | "employer"
  | "accreditor"
  | "professor"
  | "student"
  | "registrar";

export type TrustTier = "none" | "bronze" | "silver" | "gold";

export type LogEventType =
  | "REGISTER"
  | "ACME_PASS"
  | "ACME_FAIL"
  | "ISSUE_IDENTITY_CERT"
  | "VERSION_BUMP"
  | "REVOKE"
  | "ACCREDIT"
  | "DIPLOMA_ISSUE"
  | "HIRE_CHECK"
  | "TRANSFER_CREDIT"
  | "GUEST_LECTURE";

export type TransparencyEvent = {
  index: number;
  id: string;
  at: string;
  type: LogEventType;
  ansName: string;
  payload: Record<string, unknown>;
  prevHash: string;
  hash: string;
  receipt: string;
};

export type AnsAgent = {
  ansName: string;
  displayName: string;
  domain: string;
  role: AgentRole;
  version: string;
  domainVerified: boolean;
  danePinned: boolean;
  tlSealed: boolean;
  accredited: boolean;
  accreditedBy?: string;
  revoked: boolean;
  revokedReason?: string;
  capabilities: string[];
  publicKey: string;
  secret: string;
  createdAt: string;
  endpoint: string;
};

export type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;
  universityAns: string;
  professorAns: string;
  guestLecturerAns?: string;
  description: string;
};

export type Enrollment = {
  studentAns: string;
  courseId: string;
  status: "enrolled" | "completed" | "failed";
  grade?: string;
  completedAt?: string;
};

export type CreditRecord = {
  id: string;
  studentAns: string;
  courseId: string;
  courseCode: string;
  title: string;
  credits: number;
  fromUniversityAns: string;
  acceptedByUniversityAns?: string;
  transferStatus: "native" | "pending" | "accepted" | "rejected";
};

export type Diploma = {
  id: string;
  studentName: string;
  studentAns: string;
  issuerAns: string;
  issuerDomain: string;
  program: string;
  courses: Array<{ code: string; title: string; credits: number; grade: string }>;
  totalCredits: number;
  issuedAt: string;
  issuerVersion: string;
  chain: {
    accreditorAns?: string;
    universityAns: string;
    professorAns?: string;
  };
  logReceipt?: string;
  signature: string;
};

export type StudentProfile = {
  ansName: string;
  displayName: string;
  homeUniversityAns?: string;
  enrolledCourseIds: string[];
  credits: CreditRecord[];
};

export type HireResult = {
  hired: boolean;
  score: number;
  reason: string;
  checks: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
    tier?: TrustTier;
  }>;
  timeline: Array<{ at: string; label: string }>;
};

export type BusMessage = {
  id: string;
  at: string;
  from: string;
  to: string;
  kind: string;
  body: string;
  verified: boolean;
};
