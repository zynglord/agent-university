export type AnsAgent = {
  ansName: string; // ans://v1.0.0.university.agentu.edu
  displayName: string;
  domain: string;
  role: "university" | "mill" | "employer" | "accreditor" | "student";
  version: string;
  domainVerified: boolean;
  accredited: boolean;
  revoked: boolean;
  publicKey: string;
  secret: string; // demo-only signing secret
  log: Array<{ at: string; event: string }>;
};

export type Diploma = {
  id: string;
  studentName: string;
  studentAns: string;
  issuerAns: string;
  issuerDomain: string;
  program: string;
  issuedAt: string;
  signature: string;
};

export type HireResult = {
  hired: boolean;
  reason: string;
  checks: Array<{ label: string; ok: boolean; detail: string }>;
};
