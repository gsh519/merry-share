import { z } from 'zod'

// 会員登録用のバリデーションスキーマ
export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(6, 'パスワードは6文字以上で設定してください')
    .max(100, 'パスワードは100文字以内で設定してください'),
  confirmPassword: z
    .string()
    .min(1, 'パスワード（確認）は必須です'),
  userName: z
    .string()
    .min(1, 'ユーザー名は必須です')
    .max(50, 'ユーザー名は50文字以内で設定してください'),
  weddingDate: z
    .string()
    .min(1, '結婚式の日付は必須です')
    .refine((date) => {
      const selectedDate = new Date(date)
      return !isNaN(selectedDate.getTime())
    }, '有効な日付を入力してください'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

// ログイン用のバリデーションスキーマ
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードは必須です'),
})

// TypeScript型を自動生成
export type SignUpFormData = z.infer<typeof signUpSchema>
export type LoginFormData = z.infer<typeof loginSchema>
