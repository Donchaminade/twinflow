import { NextResponse } from "next/server";
import { sidecarDown } from "@/lib/tf-proxy";
import { sidecarFetch } from "@/lib/twinflow";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await sidecarFetch("/v1/status");
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return sidecarDown();
  }
}
