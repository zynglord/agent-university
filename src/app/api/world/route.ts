import { NextResponse } from "next/server";
import { snapshot } from "@/lib/university";

export async function GET() {
  return NextResponse.json(snapshot());
}
