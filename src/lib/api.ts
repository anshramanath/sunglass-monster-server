import { NextResponse } from "next/server";

export function ok(data: unknown, status: number) {
  return NextResponse.json({ success: true, data }, { status });
}

export function err(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}
