import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateHire } from "@/lib/diploma";
import type { Diploma } from "@/lib/types";

const Body = z.object({
  diploma: z.object({
    id: z.string(),
    studentName: z.string(),
    studentAns: z.string(),
    issuerAns: z.string(),
    issuerDomain: z.string(),
    program: z.string(),
    issuedAt: z.string(),
    signature: z.string(),
  }),
});

export async function POST(req: Request) {
  const { diploma } = Body.parse(await req.json()) as { diploma: Diploma };
  const result = evaluateHire(diploma);
  return NextResponse.json(result);
}
