import { initTRPC, TRPCError } from '@trpc/server'
import { createContext, Context } from './context'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.account) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { account: ctx.account } })
})

export const protectedProcedure = t.procedure.use(isAuthed)
