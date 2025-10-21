import { router } from '~/src/server/trpc'
import { tenderRouter } from './tender'
import { docRouter } from './doc'
import { checklistRouter } from './checklist'

export const appRouter = router({
  tender: tenderRouter,
  doc: docRouter,
  checklist: checklistRouter,
})

export type AppRouter = typeof appRouter
