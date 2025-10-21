import { prisma } from '~/src/lib/prisma'
import { supabaseAdmin } from '~/src/lib/supabaseServer'

export type Context = {
  prisma: typeof prisma
  account: any | null
  session: any | null
}

export async function createContext({ req, res }: { req: any; res?: any }): Promise<Context> {
  // Try to get Supabase access token from Authorization header or cookie
  let token: string | null = null
  const authHeader = req?.headers?.authorization || req?.headers?.Authorization
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) token = authHeader.split(' ')[1]
  // sb:token cookie (client SDK uses this name)
  if (!token && req?.cookies) token = req.cookies['sb:token'] || null

  let account: any | null = null
  let session: any = null
  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (!error && data?.user) {
      session = { user: data.user }
      const email = data.user.email
      if (email) {
        account = await prisma.account.findFirst({ where: { users: { some: { email } } } })
      }
    }
  }
  return { prisma, account, session }
}


