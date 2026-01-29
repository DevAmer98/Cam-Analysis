import { NextResponse } from "next/server";
import { mockNvrSnapshots, mockSnapshot } from "../../../lib/mockData";

export async function POST(req: Request) {
  // Normally you'd forward this payload to your NVR API. We return mock data for now.
  const payload = await req.json().catch(() => ({}));

  const selected =
    typeof payload?.nvrId === "string"
      ? mockNvrSnapshots.find((item) => item.nvrId === payload.nvrId)
      : null;

  return NextResponse.json({
    ok: true,
    source: payload?.baseUrl ?? "mock",
    snapshot: selected ?? mockSnapshot
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "mock",
    snapshot: mockSnapshot
  });
}
