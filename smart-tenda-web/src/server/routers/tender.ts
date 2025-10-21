import { router, publicProcedure } from '~/src/server/trpc'
import { z } from 'zod'

export const tenderRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.tender.findMany({ orderBy: { closeDate: 'asc' } })
  }),
  create: publicProcedure
    .input(z.object({ refNo: z.string(), title: z.string(), closeDate: z.string(), category: z.string(), county: z.string(), securityAmt: z.number().optional(), rawPdfUrl: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.tender.create({ data: { ...input, openDate: new Date().toISOString(), accountId: ctx.account?.id || '' } as any })
    }),
})
