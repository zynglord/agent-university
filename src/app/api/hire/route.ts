import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateHire, getDiploma } from "@/lib/university";
import type { Diploma } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json();
  const diploma = (body.diploma ?? getDiploma(body.diplomaId)) as Diploma | undefined;
  if (!diploma) {
    return NextResponse.json({ error: "Diploma required" }, { status: 400 });
  }
  const tier = z.enum(["bronze", "silver", "gold"]).default("silver").parse(body.tier);
  const result = evaluateHire(diploma, tier);
  return NextResponse.json(result);
}
