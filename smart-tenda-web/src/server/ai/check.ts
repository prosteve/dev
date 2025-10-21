import { NextResponse } from 'next/server'
import Ajv from 'ajv'

type Tender = any
type Doc = any

const ajv = new Ajv({ allErrors: true, strict: false })

const checksSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      docType: { type: 'string' },
      status: { type: 'string', enum: ['PASS', 'FAIL', 'WARN'] },
      detail: { type: ['object', 'null'] },
    },
    required: ['docType', 'status', 'detail'],
    additionalProperties: false,
  },
}

const validateChecks = ajv.compile(checksSchema as any)

// simple in-memory cooldown per tenderId
const lastRun: Record<string, number> = {}

async function fetchWithRetry(url: string, opts: any, attempts = 3) {
  let i = 0
  let lastErr: any
  while (i < attempts) {
    try {
      const res = await fetch(url, opts)
      if (!res.ok) {
        let bodyText = ''
        try {
          bodyText = await res.text()
        } catch (e) {
          bodyText = '<unreadable body>'
        }
        throw new Error(`status:${res.status} body:${bodyText}`)
      }
      return res
    } catch (err) {
      lastErr = err
      i++
      await new Promise((r) => setTimeout(r, 200 * i))
    }
  }
  throw lastErr
}

export async function runChecks(tender: Tender, docs: Doc[]): Promise<any[]> {
  const tenderId = (tender && (tender.id || tender.refNo)) || 'global'
  const now = Date.now()
  if (lastRun[tenderId] && now - lastRun[tenderId] < 30 * 1000) {
    throw new Error('Cooldown: please wait before re-running checks for this tender')
  }
  lastRun[tenderId] = now

  const moonKey = process.env.MOONSHOT_API_KEY
  const moonUrl = process.env.MOONSHOT_API_URL || ''
  const endpoint = moonUrl ? moonUrl.replace(/\/$/, '') + '/chat/completions' : null
  if (!endpoint || !moonKey) throw new Error('No Moonshot provider configured')

  const systemMessage = {
    role: 'system',
    content:
      'You are Kimi, an AI assistant. You must return ONLY a JSON array of checks according to the schema: [{"docType": string, "status": "PASS|FAIL|WARN", "detail": object}]. Do not include any extra explanatory text.',
  }

  const userPayload = {
    role: 'user',
    content: `Analyze the following tender and account documents and return a JSON array of checks. Tender: ${JSON.stringify(
      tender,
    )}. Docs: ${JSON.stringify(docs)}. For each doc produce: { docType, status (PASS|FAIL|WARN), detail: { ... } }`,
  }

  const payload = {
    model: 'kimi-k2-0905-preview',
    messages: [systemMessage, userPayload],
    temperature: 0,
    max_tokens: 1500,
  }

  const headers: any = { 'Content-Type': 'application/json', Authorization: `Bearer ${moonKey}` }

  const res = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  // extract content
  let content: string | undefined
  if (data?.choices?.[0]?.message?.content) content = data.choices[0].message.content
  else if (data?.choices?.[0]?.text) content = data.choices[0].text
  else if (typeof data.output === 'string') content = data.output
  else if (typeof data.result === 'string') content = data.result

  if (!content) throw new Error(`No content from model: ${JSON.stringify(data)}`)

  const stripFences = (s: string) => s.replace(/(^```json\s*)|(^```\s*)|(```$)/g, '').trim()
  const cleaned = stripFences(content)

  // Try parse + validate
  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    // try substring
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = cleaned.slice(start, end + 1)
      try {
        parsed = JSON.parse(candidate)
      } catch (err2) {
        // will attempt repair
        parsed = null
      }
    }
  }

  const tryValidate = (obj: any) => {
    try {
      const ok = validateChecks(obj)
      return ok ? obj : null
    } catch (e) {
      return null
    }
  }

  let valid = tryValidate(parsed)
  if (valid) return valid as any[]
  // If invalid, attempt one-shot repair: ask model to reformat into strict JSON array
  if (!valid) {
    const repairSystem = { role: 'system', content: 'You are Kimi. Reformat the following output so it is EXACTLY a JSON array that matches the schema: ' + JSON.stringify(checksSchema) + '. Return ONLY the JSON array.' }
    const repairUser = { role: 'user', content: `Here is the original output: ${cleaned}. Please return only a JSON array that matches the schema.` }
    const repairPayload = { model: 'kimi-k2-0905-preview', messages: [repairSystem, repairUser], temperature: 0, max_tokens: 1500 }
    const repairRes = await fetchWithRetry(endpoint, { method: 'POST', headers, body: JSON.stringify(repairPayload) })
    const repairData = await repairRes.json()
    const repairContent = repairData?.choices?.[0]?.message?.content || repairData?.choices?.[0]?.text || repairData.output || repairData.result
    const repairClean = repairContent ? stripFences(repairContent) : ''
    try {
      const repaired = JSON.parse(repairClean)
      const validated = tryValidate(repaired)
      if (validated) return validated as any[]
      throw new Error('Repaired output failed schema validation')
    } catch (e) {
      throw new Error('Model output invalid and repair failed: ' + e)
    }
  }

  return valid as any[]
}

export default runChecks
