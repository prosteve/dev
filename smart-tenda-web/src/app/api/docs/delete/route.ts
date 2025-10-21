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
  const { id } = body as { id?: string }
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.doc.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Doc not found' }, { status: 404 })

  // verify owner
  const account = await prisma.user.findUnique({ where: { email: userData.user.email }, include: { account: true } })
  if (!account || account.account.id !== existing.accountId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // delete from storage
  try {
    await supabaseAdmin.storage.from('documents').remove([existing.s3Key])
  } catch (e) {
    // ignore storage deletion errors for now
    // eslint-disable-next-line no-console
    console.error('storage delete failed', e)
  }

  await prisma.doc.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
