import { PrismaClient } from '@prisma/client'

const createPrismaClient = () => {
  // ブラウザ環境ではPrismaClientを初期化しない
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient is not available in the browser')
  }

  // deleted_atフィルタを持つモデルを定義
  const modelsWithDeletedAt = ['wedding', 'user', 'media', 'invitation'] as const

  const client = new PrismaClient().$extends({
    name: 'softDelete',
    query: {
      $allModels: {
        async findMany({ args, query, model }) {
          // deleted_atを持つモデルのみフィルタを適用
          if (modelsWithDeletedAt.includes(model as any)) {
            args.where = { ...args.where, deleted_at: null }
          }
          return query(args)
        },
        async findFirst({ args, query, model }) {
          if (modelsWithDeletedAt.includes(model as any)) {
            args.where = { ...args.where, deleted_at: null }
          }
          return query(args)
        },
        async findUnique({ args, query, model }) {
          if (modelsWithDeletedAt.includes(model as any)) {
            args.where = { ...args.where, deleted_at: null }
          }
          return query(args)
        },
        async count({ args, query, model }) {
          if (modelsWithDeletedAt.includes(model as any)) {
            args.where = { ...args.where, deleted_at: null }
          }
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