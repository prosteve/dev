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
  const { filename, contentType } = body as { filename?: string; contentType?: string }
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

  // create a unique key
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`

  // generate presigned URL using Supabase Storage signedURL
  // Supabase createSignedUploadUrl signature varies by SDK version; cast to any to call runtime API
  const res: any = await (supabaseAdmin.storage.from('documents') as any).createSignedUploadUrl(key, 60 * 5)
  const { data, error } = res || {}
  if (error || !data) return NextResponse.json({ error: 'Failed to create upload url' }, { status: 500 })

  return NextResponse.json({ uploadUrl: data.signedUrl, key })
}
