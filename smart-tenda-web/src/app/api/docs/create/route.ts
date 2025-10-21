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
  const { key, type, issueDate, expiryDate } = body as { key?: string; type?: string; issueDate?: string; expiryDate?: string }
  if (!key || !type) return NextResponse.json({ error: 'key and type required' }, { status: 400 })

  const account = await prisma.user.findUnique({ where: { email: userData.user.email }, include: { account: true } })
  if (!account || !account.account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const doc = await prisma.doc.create({
    data: {
      type,
      s3Key: key,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : new Date('2100-01-01'),
      accountId: account.account.id,
    },
  })

  return NextResponse.json(doc)
}
