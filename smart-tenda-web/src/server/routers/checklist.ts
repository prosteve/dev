import { router, protectedProcedure } from '~/src/server/trpc'
import { z } from 'zod'
import runChecks from '~/src/server/ai/check'

export const checklistRouter = router({
  run: protectedProcedure
    .input(z.object({ tenderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
  const tender = await ctx.prisma.tender.findUnique({ where: { id: input.tenderId } })
  const docs = await ctx.prisma.doc.findMany({ where: { accountId: ctx.account?.id } })
  // Use the new runChecks helper which calls Moonshot
  const checks = await runChecks(tender, docs)
  await ctx.prisma.check.deleteMany({ where: { tenderId: input.tenderId } })
  await ctx.prisma.check.createMany({ data: checks.map((c: any) => ({ ...c, tenderId: input.tenderId })) })
  return checks
    }),
})
