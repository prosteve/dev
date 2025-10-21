import { NextResponse } from 'next/server'
import { supabaseAdmin } from '~/src/lib/supabaseServer'
import { prisma } from '~/src/lib/prisma'

export async function POST(req: Request, { params }: { params: { checkId: string } }) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const checkId = params.checkId
  const existing = await prisma.check.findUnique({ where: { id: checkId } })
  if (!existing) return NextResponse.json({ error: 'Check not found' }, { status: 404 })

  const actorEmail = userData.user.email
  const prevDetail = typeof existing.detail === 'object' && existing.detail ? existing.detail : {}
  const now = new Date()
  const newDetail = { ...(prevDetail as any), accepted: true, acceptedBy: actorEmail, acceptedAt: now.toISOString() }

  // Update the Check with acceptance metadata
  const updated = await prisma.check.update({
    where: { id: checkId },
    data: {
      detail: newDetail as any,
      updatedAt: now,
    },
  })

  // Write an AuditLog entry for traceability
  try {
    // use bracket access to avoid generated prisma client typing mismatch in some environments
    await (prisma as any).auditLog.create({
      data: {
        tenderId: existing.tenderId,
        checkId: checkId,
        action: 'accepted',
        actorEmail,
        meta: { previousDetail: prevDetail, newDetail },
      },
    })
  } catch (e) {
    // Do not fail the request if audit logging fails; just log to console
    // (Supabase server logs / monitoring should capture this in production)
    // eslint-disable-next-line no-console
    console.error('Failed to write AuditLog', e)
  }

  return NextResponse.json(updated)
}
