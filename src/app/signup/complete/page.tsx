"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// 会員登録完了用のスキーマ
const completeSignUpSchema = z.object({
  weddingDate: z.string().min(1, "結婚式の日付を入力してください"),
});

type CompleteSignUpFormData = z.infer<typeof completeSignUpSchema>;

function SignUpCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessToken = searchParams.get("access_token");
  const refreshToken = searchParams.get("refresh_token");
  const email = searchParams.get("email");
  const name = searchParams.get("name");
  const invitationToken = searchParams.get("invitation_token");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteSignUpFormData>({
    resolver: zodResolver(completeSignUpSchema),
  });

  useEffect(() => {
    // 必要な情報が揃っていない場合はログインページへ
    if (!accessToken || !refreshToken || !email || !name) {
      router.push("/login");
    }
  }, [accessToken, refreshToken, email, name, router]);

  const onSubmit = async (data: CompleteSignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          userName: name,
          weddingDate: data.weddingDate,
          invitationToken: invitationToken || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "会員登録に失敗しました");
      }

      const result = await response.json();

      // Zustandストアに保存するため、ローカルストレージに一時保存
      localStorage.setItem(
        "auth-storage",
        JSON.stringify({
          state: {
            user: result.user,
            wedding: result.wedding,
            accessToken,
            refreshToken,
          },
          version: 0,
        })
      );

      // ホームページへリダイレクト
      router.push("/");
    } catch (err) {
      console.error("Complete signup error:", err);
      setError(err instanceof Error ? err.message : "会員登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (!accessToken || !refreshToken || !email || !name) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            会員登録を完了してください
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {invitationToken
              ? "招待されたウェディングに参加します"
              : "結婚式の日付を入力してください"}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              お名前
            </label>
            <input
              id="name"
              type="text"
              value={name}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500"
            />
          </div>

          {!invitationToken && (
            <div>
              <label htmlFor="weddingDate" className="block text-sm font-medium text-gray-700">
                結婚式の日付 <span className="text-red-500">*</span>
              </label>
              <input
                id="weddingDate"
                type="date"
                {...register("weddingDate")}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.weddingDate && (
                <p className="mt-1 text-sm text-red-600">{errors.weddingDate.message}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "登録中..." : "登録完了"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignUpCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">読み込み中...</div>}>
      <SignUpCompleteContent />
    </Suspense>
  );
}
