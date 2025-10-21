import { NextResponse } from 'next/server'
import runChecks from '~/src/server/ai/check'

export async function POST(req: Request) {
  const body = await req.json()
  try {
    const checks = await runChecks(body.tender, body.docs)
    return NextResponse.json(checks)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
