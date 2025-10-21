#!/usr/bin/env node
require('dotenv').config()
const https = require('https')

async function fetchWithRetry(url, opts, attempts = 3) {
  let i = 0
  let lastErr
  while (i < attempts) {
    try {
      const data = await new Promise((resolve, reject) => {
        const req = https.request(url, opts, (res) => {
          let b = ''
          res.on('data', (c) => (b += c))
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: b }))
        })
        req.on('error', reject)
        if (opts.body) req.write(opts.body)
        req.end()
      })
      if (data.status < 200 || data.status >= 300) throw new Error(`status:${data.status} body:${data.body}`)
      return { json: async () => JSON.parse(data.body), text: async () => data.body }
    } catch (err) {
      lastErr = err
      i++
      await new Promise((r) => setTimeout(r, 200 * i))
    }
  }
  throw lastErr
}

async function runChecks(tender, docs) {
  const moonKey = process.env.MOONSHOT_API_KEY
  const moonUrl = process.env.MOONSHOT_API_URL
  const endpoint = moonUrl ? moonUrl.replace(/\/$/, '') + '/chat/completions' : null
  if (!endpoint || !moonKey) throw new Error('No Moonshot provider configured')

  const systemMessage = { role: 'system', content: 'You are Kimi, return ONLY a JSON array of checks [{docType,status,detail}]' }
  const userPayload = { role: 'user', content: `Analyze tender:${JSON.stringify(tender)} docs:${JSON.stringify(docs)}` }
  const payload = { model: 'kimi-k2-0905-preview', messages: [systemMessage, userPayload], temperature: 0, max_tokens: 1500 }

  const res = await fetchWithRetry(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + moonKey }, body: JSON.stringify(payload) })
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data.output || data.result
  if (!content) throw new Error('No content from model')
  const cleaned = content.replace(/(^```json\s*)|(^```\s*)|(```$)/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : parsed.checks || parsed
  } catch (e) {
    const s = cleaned.indexOf('[')
    const eidx = cleaned.lastIndexOf(']')
    if (s !== -1 && eidx !== -1 && eidx > s) {
      const candidate = cleaned.slice(s, eidx + 1)
      return JSON.parse(candidate)
    }
    throw new Error('Failed to parse model output: ' + cleaned)
  }
}

;(async function main(){
  const tender = { id: 't1', title: 'Sample Tender', amount: 50000 }
  const docs = [ { id:'d1', docType:'TenderNotice', text:'Tender notice with signatures.' }, { id:'d2', docType:'BidBond', text:'Bank guarantee included.' } ]
  try {
    const checks = await runChecks(tender, docs)
    console.log('CHECKS', JSON.stringify(checks, null, 2))
  } catch (err) {
    console.error('ERROR', err)
    process.exit(1)
  }
})()
