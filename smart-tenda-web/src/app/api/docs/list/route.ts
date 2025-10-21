import { NextResponse } from 'next/server'
import { supabaseAdmin } from '~/src/lib/supabaseServer'
import { prisma } from '~/src/lib/prisma'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // find account by user email
  const account = await prisma.user.findUnique({ where: { email: userData.user.email }, include: { account: true } })
  if (!account || !account.account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const docs = await prisma.doc.findMany({ where: { accountId: account.account.id }, orderBy: { issueDate: 'desc' } })
  return NextResponse.json(docs)
}
