import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Prototype upload endpoint: accept multipart and respond success without storing
  return NextResponse.json({ ok: true })
}
