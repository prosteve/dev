import { NextResponse } from 'next/server'
import { supabaseAdmin } from '~/src/lib/supabaseServer'
import { prisma } from '~/src/lib/prisma'
// import pdf-lib dynamically to avoid missing type declarations in this environment
const PDFLib: any = require('pdf-lib')
const PDFDocument = PDFLib.PDFDocument

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.split(' ')[1] : null
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { docIds, coverLetterHtml, filename, tenderId } = body as { docIds?: string[]; coverLetterHtml?: string; filename?: string; tenderId?: string }
  if (!Array.isArray(docIds) || docIds.length === 0) return NextResponse.json({ error: 'docIds required' }, { status: 400 })

  // verify account and ownership
  const accountUser = await prisma.user.findUnique({ where: { email: userData.user.email }, include: { account: true } })
  if (!accountUser || !accountUser.account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  const docs = await prisma.doc.findMany({ where: { id: { in: docIds }, accountId: accountUser.account.id } })
  if (docs.length !== docIds.length) return NextResponse.json({ error: 'One or more documents not found or forbidden' }, { status: 403 })

  // fetch each PDF from Supabase Storage
  const pdfDoc = await PDFDocument.create()

  // If coverLetterHtml provided, try to render it to PDF using puppeteer and insert as first page
  if (coverLetterHtml) {
    try {
      // Dynamically require puppeteer so it is optional at runtime
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer')
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
      const page = await browser.newPage()
      await page.setContent(coverLetterHtml, { waitUntil: 'networkidle0' })
      const coverPdfBuffer = await page.pdf({ format: 'A4', printBackground: true })
      await browser.close()
      const coverDoc = await PDFDocument.load(coverPdfBuffer)
      const coverPages = await pdfDoc.copyPages(coverDoc, coverDoc.getPageIndices())
      coverPages.forEach((p: any) => pdfDoc.addPage(p))
    } catch (e) {
      // fallback to plain text page
      const cover = pdfDoc.addPage()
      const text = coverLetterHtml.replace(/<[^>]+>/g, '')
      cover.drawText(text.slice(0, 3000), { x: 50, y: cover.getHeight() - 50, size: 12 })
    }
  }

  for (const id of docIds) {
    const d = docs.find((x) => x.id === id)!
    const key = d.s3Key
    const download = await supabaseAdmin.storage.from('documents').download(key)
    if (!download || !download.data) return NextResponse.json({ error: `Failed to download ${key}` }, { status: 500 })
    const arrayBuffer = await download.data.arrayBuffer()
    const donor = await PDFDocument.load(arrayBuffer)
    const copied = await pdfDoc.copyPages(donor, donor.getPageIndices())
    copied.forEach((page: any) => pdfDoc.addPage(page))
  }

  const merged = await pdfDoc.save()

  // store merged PDF in storage
  const outKey = `packages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename ?? 'package'}.pdf`
  const upload = await supabaseAdmin.storage.from('documents').upload(outKey, Buffer.from(merged), { contentType: 'application/pdf' })
  if (upload.error) return NextResponse.json({ error: 'Failed to save package' }, { status: 500 })

  // create signed URL for download
  const signed: any = await (supabaseAdmin.storage.from('documents') as any).createSignedDownloadUrl(outKey, 60 * 60)
  if (!signed || signed.error || !signed.data) return NextResponse.json({ error: 'Failed to create download url' }, { status: 500 })

  // record a Submission and AuditLog
  try {
  await (prisma as any).submission.create({ data: { tenderId: tenderId ?? null, accountId: accountUser.account.id, key: outKey, filename: filename ?? 'package.pdf', meta: { docIds } } })
  await (prisma as any).auditLog.create({ data: { action: 'compile_package', actorEmail: userData.user.email, meta: { docIds, outKey } } })
  } catch (e) {
    // ignore audit or submission errors
    // eslint-disable-next-line no-console
    console.error('submission/audit failed', e)
  }

  return NextResponse.json({ downloadUrl: signed.data.signedUrl, key: outKey })
}
