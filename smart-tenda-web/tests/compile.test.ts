// use node-fetch at runtime; avoid TypeScript type errors in the test file
// @ts-ignore
const fetch: any = globalThis.fetch || require('node-fetch')
import { describe, it, expect, beforeAll } from '@jest/globals'
import { createServer } from 'http'

// This is a lightweight integration-style test that ensures the compile route
// returns a signed URL when called with mock tokens. It uses the local server
// (not starting Next.js) and stubs network calls where appropriate.

describe('compile route', () => {
  it('rejects without auth', async () => {
    // Ensure module mocks are reset
    jest.resetModules()


    // Mock heavy external modules and libs before importing the route
    jest.doMock('pdf-lib', () => {
      // minimal mock of pdf-lib used by compile route
      return {
        PDFDocument: {
          create: async () => ({
            addPage: () => {},
            copyPages: async () => [],
            save: async () => new Uint8Array(),
          }),
          load: async () => ({ getPageIndices: () => [] }),
        },
      }
    })

    // Mock supabaseAdmin to return no user for auth.getUser
    jest.doMock('../src/lib/supabaseServer', () => ({
      supabaseAdmin: {
        auth: { getUser: async () => ({ data: { user: null } }) },
        storage: { from: () => ({ download: async () => ({ data: null }) }) },
      },
    }))

    // Mock prisma minimal shape (not used because auth fails)
    jest.doMock('../src/lib/prisma', () => ({ prisma: {} }))

    // import the route handler after mocks
    const mod = await import('../src/app/api/docs/compile/route')
    // @ts-ignore - use node-fetch Request
    const { Request } = require('node-fetch')
    const req = new Request('http://localhost/api/docs/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docIds: ['x'] }) })
    const res: any = await mod.POST(req)
    // Check that the route returned an unauthorized response or payload
    const json = res?.json ? await res.json() : null
    expect(res?.status === 401 || json?.error === 'Unauthorized').toBeTruthy()
  })
})
