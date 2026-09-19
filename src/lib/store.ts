import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import type {
  AnsAgent,
  BusMessage,
  Course,
  CreditRecord,
  Diploma,
  Enrollment,
  StudentProfile,
  TransparencyEvent,
  LogEventType,
} from "./types";

export type World = {
  agents: Map<string, AnsAgent>;
  courses: Map<string, Course>;
  enrollments: Enrollment[];
  credits: CreditRecord[];
  diplomas: Map<string, Diploma>;
  students: Map<string, StudentProfile>;
  log: TransparencyEvent[];
  bus: BusMessage[];
  seeded: boolean;
};

const g = globalThis as unknown as { __agentUniverse?: World };

export function world(): World {
  if (!g.__agentUniverse) {
    g.__agentUniverse = {
      agents: new Map(),
      courses: new Map(),
      enrollments: [],
      credits: [],
      diplomas: new Map(),
      students: new Map(),
      log: [],
      bus: [],
      seeded: false,
    };
  }
  return g.__agentUniverse;
}

export function hashChain(prev: string, body: string) {
  return createHash("sha256").update(prev + "|" + body).digest("hex");
}

export function appendLog(
  type: LogEventType,
  ansName: string,
  payload: Record<string, unknown>,
): TransparencyEvent {
  const w = world();
  const prevHash = w.log.length ? w.log[w.log.length - 1].hash : "GENESIS";
  const id = randomUUID();
  const at = new Date().toISOString();
  const body = JSON.stringify({ id, at, type, ansName, payload });
  const hash = hashChain(prevHash, body);
  const receipt = createHmac("sha256", "tl-root-demo")
    .update(hash)
    .digest("hex");
  const event: TransparencyEvent = {
    index: w.log.length,
    id,
    at,
    type,
    ansName,
    payload,
    prevHash,
    hash,
    receipt,
  };
  w.log.push(event);
  return event;
}

export function makeKeyPair(ansName: string) {
  const secret = randomBytes(24).toString("hex");
  const publicKey = createHmac("sha256", "agentu-root")
    .update(ansName + secret)
    .digest("hex")
    .slice(0, 32);
  return { secret, publicKey };
}

export function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function pushBus(
  from: string,
  to: string,
  kind: string,
  body: string,
  verified: boolean,
) {
  const msg: BusMessage = {
    id: randomUUID(),
    at: new Date().toISOString(),
    from,
    to,
    kind,
    body,
    verified,
  };
  const w = world();
  w.bus.unshift(msg);
  w.bus = w.bus.slice(0, 80);
  return msg;
}

export function publicAgent(a: AnsAgent) {
  const { secret: _s, ...rest } = a;
  return rest;
}
