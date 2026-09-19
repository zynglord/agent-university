import { NextResponse } from "next/server";
import { z } from "zod";
import {
  completeCourse,
  ensureStudent,
  enroll,
  graduate,
  issueMillDiploma,
  listCourses,
  requestTransfer,
} from "@/lib/university";
import { bumpVersion, revoke } from "@/lib/ans";
import { constants } from "@/lib/seed";

export async function GET() {
  return NextResponse.json({ courses: listCourses(), constants: constants() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const action = body.action as string;

  try {
    switch (action) {
      case "ensureStudent": {
        const name = z.string().parse(body.name);
        return NextResponse.json({ student: ensureStudent(name) });
      }
      case "enroll": {
        const studentAns = z.string().parse(body.studentAns);
        const courseId = z.string().parse(body.courseId);
        return NextResponse.json({ enrollment: enroll(studentAns, courseId) });
      }
      case "complete": {
        const studentAns = z.string().parse(body.studentAns);
        const courseId = z.string().parse(body.courseId);
        return NextResponse.json({
          credit: completeCourse(studentAns, courseId),
        });
      }
      case "transfer": {
        const studentAns = z.string().parse(body.studentAns);
        const creditId = z.string().parse(body.creditId);
        const toUniversityAns = z.string().parse(body.toUniversityAns);
        return NextResponse.json({
          credit: requestTransfer(studentAns, creditId, toUniversityAns),
        });
      }
      case "graduate": {
        const studentAns = z.string().parse(body.studentAns);
        const issuerAns = z.string().parse(body.issuerAns);
        const program = z.string().default("B.S. Autonomous Systems").parse(body.program);
        return NextResponse.json({
          diploma: graduate(studentAns, issuerAns, program),
        });
      }
      case "millDiploma": {
        const name = z.string().parse(body.name);
        return NextResponse.json({ diploma: issueMillDiploma(name) });
      }
      case "bumpIssuer": {
        const ansName = z.string().parse(body.ansName);
        return NextResponse.json({ agent: bumpVersion(ansName) });
      }
      case "revokeIssuer": {
        const ansName = z.string().parse(body.ansName);
        const reason = z.string().default("Manual revoke").parse(body.reason);
        return NextResponse.json({ agent: revoke(ansName, reason) });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed" },
      { status: 400 },
    );
  }
}
