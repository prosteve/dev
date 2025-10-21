import { NextResponse } from 'next/server'
import { supabaseAdmin } from '~/src/lib/supabaseServer'
import { prisma } from '~/src/lib/prisma'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { docId, action } = body as { docId?: string; action?: string }
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

  // For now just record an AuditLog entry to simulate enqueueing a job
  try {
    await (prisma as any).auditLog.create({ data: { action: action || 'process_doc', actorEmail: userData.user.email, meta: { docId } } })
  } catch (e) {
    // ignore
  }

  return NextResponse.json({ queued: true })
}
