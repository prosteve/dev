import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.account.upsert({
    where: { id: 'acct-demo-1' },
    update: {},
    create: { id: 'acct-demo-1', name: 'SmartTenda Demo', kraPin: 'KRA-DEMO-0001' },
  })

  await prisma.user.upsert({
    where: { id: 'user-demo-1' },
    update: {},
    create: { id: 'user-demo-1', email: 'demo@example.com', name: 'Demo User', accountId: 'acct-demo-1' },
  })
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
