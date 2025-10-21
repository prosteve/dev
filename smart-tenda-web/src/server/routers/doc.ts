import { router, protectedProcedure } from '~/src/server/trpc'
import { z } from 'zod'
import { createPresignedPost } from '~/src/lib/s3'

export const docRouter = router({
  presign: protectedProcedure
    .input(z.object({ type: z.enum(['CR12', 'TCC', 'T3']), filename: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const key = `docs/${ctx.account?.id}/${input.type}/${Date.now()}-${input.filename}`
      const url = await createPresignedPost({ Bucket: process.env.S3_BUCKET!, Key: key, Expires: 600 })
      return url
    }),
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.doc.findMany({ where: { accountId: ctx.account?.id } })
  }),
})
