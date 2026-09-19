import { NextResponse } from "next/server";
import { z } from "zod";
import { issueDiploma } from "@/lib/diploma";

const Body = z.object({
  studentName: z.string().min(1),
  issuerAns: z.string().min(1),
  program: z.string().default("Autonomous Systems 101"),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const diploma = issueDiploma(body);
    return NextResponse.json({ diploma });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Issue failed" },
      { status: 400 },
    );
  }
}
