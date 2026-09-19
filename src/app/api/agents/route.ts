import { NextResponse } from "next/server";
import { listAgents, seedAns } from "@/lib/ans";

export async function GET() {
  seedAns();
  return NextResponse.json({ agents: listAgents() });
}
