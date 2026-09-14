import { NextResponse } from "next/server";
import { invalidJSON, sidecarDown } from "@/lib/tf-proxy";
import { sidecarFetch } from "@/lib/twinflow";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidJSON();
  }
  try {
    const upstream = await sidecarFetch("/v1/exec", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return sidecarDown();
  }
}
