import { NextResponse } from 'next/server'
import { prisma } from '~/src/lib/prisma'
import { supabaseAdmin } from '~/src/lib/supabaseServer'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { email, name, kraPin, accountName } = body as { email?: string; name?: string; kraPin?: string; accountName?: string }
  if (!email || !kraPin || !accountName) return NextResponse.json({ error: 'email, kraPin, accountName required' }, { status: 400 })

  // Create account if missing
  let account = await prisma.account.findUnique({ where: { kraPin } })
  if (!account) {
    account = await prisma.account.create({ data: { name: accountName, kraPin } })
  }

  // create or update user
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({ data: { email, name: name ?? undefined, accountId: account.id } })
  } else if (user.accountId !== account.id) {
    user = await prisma.user.update({ where: { email }, data: { accountId: account.id } })
  }

  // ensure Supabase user exists (do not create password, assume magic-link flow managed client-side)
  try {
    await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })
  } catch (e) {
    // ignore if already exists
  }

  return NextResponse.json({ account, user })
}
