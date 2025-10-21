import { PrismaClient } from '@prisma/client'

const createPrismaClient = () => {
  // ブラウザ環境ではPrismaClientを初期化しない
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient is not available in the browser')
  }

  const client = new PrismaClient().$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, deleted_at: null }
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, deleted_at: null }
          return query(args)
        },
        async findUnique({ args, query }) {
          args.where = { ...args.where, deleted_at: null }
          return query(args)
        },
        async count({ args, query }) {
          args.where = { ...args.where, deleted_at: null }
          return query(args)
        },
      },
    },
  })

  return client
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = typeof window === 'undefined'
  ? (globalForPrisma.prisma ?? createPrismaClient())
  : ({} as ReturnType<typeof createPrismaClient>)

if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
  globalForPrisma.prisma = prisma
}