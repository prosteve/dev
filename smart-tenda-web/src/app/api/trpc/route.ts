import { createNextApiHandler } from '@trpc/server/adapters/next'
import { appRouter } from '~/src/server/routers/_app'
import { createContext } from '~/src/server/context'

export async function POST(req: Request) {
  // Delegate to tRPC's Next adapter
  const handler = createNextApiHandler({
    router: appRouter,
    createContext: () => createContext({ req } as any),
  })
  // createNextApiHandler expects Node req/res; but in App Router we'll use a simple proxy
  // For now, accept POST and return 501 to indicate client should call tRPC via other means.
  return new Response(JSON.stringify({ error: 'tRPC handler not implemented for App Router' }), { status: 501 })
}
