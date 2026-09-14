import { NextResponse } from "next/server";
import { sidecarFetch } from "@/lib/twinflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await sidecarFetch("/v1/status");
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "TwinFlow sidecar unreachable. Is it running on TWINFLOW_URL?" },
      { status: 502 },
    );
  }
}
