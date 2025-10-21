import { NextResponse } from 'next/server'
import { prisma } from '~/src/lib/prisma'
import { supabaseAdmin } from '~/src/lib/supabaseServer'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { refNo, title, openDate, closeDate, category, county, securityAmt, source, rawPdfKey } = body as any
  if (!refNo || !title) return NextResponse.json({ error: 'refNo and title required' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: userData.user.email }, include: { account: true } })
  if (!user || !user.account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const tender = await prisma.tender.create({ data: { refNo, title, openDate: new Date(openDate ?? Date.now()), closeDate: new Date(closeDate ?? Date.now()), category: category ?? '', county: county ?? '', securityAmt: securityAmt ?? null, source: source ?? '', rawPdfUrl: rawPdfKey ? `documents/${rawPdfKey}` : null, accountId: user.account.id } })

  return NextResponse.json(tender)
}
