import { NextResponse } from "next/server";
import { sidecarFetch } from "@/lib/twinflow";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  try {
    const upstream = await sidecarFetch("/v1/exec", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "TwinFlow sidecar unreachable. Is it running on TWINFLOW_URL?" },
      { status: 502 },
    );
  }
}
