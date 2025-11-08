import { PrismaClient } from '@prisma/client'

const createPrismaClient = () => {
  // ブラウザ環境ではPrismaClientを初期化しない
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient is not available in the browser')
  }

  // deleted_atフィルタを持つモデル（wedding, user, media, invitation）に対して
  // ソフトデリート機能を適用
  const client = new PrismaClient().$extends({
    name: 'softDelete',
    query: {
      wedding: {
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
      user: {
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
      media: {
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
      invitation: {
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

if (typeof window === 'undefined') {
  globalForPrisma.prisma = prisma
}

// default exportを追加
export default prisma