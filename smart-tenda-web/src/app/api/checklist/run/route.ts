import { NextResponse } from 'next/server'
import runChecks from '~/src/server/ai/check'
import { prisma } from '~/src/lib/prisma'
import { supabaseAdmin } from '~/src/lib/supabaseServer'

export async function POST(req: Request) {
  // Accept either an Authorization bearer token or rely on server-side cookies
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const tenderId = body?.tenderId
  if (!tenderId) return NextResponse.json({ error: 'tenderId required' }, { status: 400 })

  const account = await prisma.account.findFirst({ where: { users: { some: { email: userData.user.email } } } as any })
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const tender = await prisma.tender.findUnique({ where: { id: tenderId } })
  const docs = await prisma.doc.findMany({ where: { accountId: account.id } })

  try {
    const checks = await runChecks(tender, docs)
    await prisma.check.deleteMany({ where: { tenderId } })
    await prisma.check.createMany({ data: checks.map((c: any) => ({ ...c, tenderId })) })
    return NextResponse.json(checks)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
