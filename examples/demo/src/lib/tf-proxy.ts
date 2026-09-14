import { NextResponse } from "next/server";
import { sidecarUnavailableBody } from "@/lib/twinflow";

export function invalidJSON() {
  return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
}

export function sidecarDown() {
  return NextResponse.json(sidecarUnavailableBody(), { status: 502 });
}
