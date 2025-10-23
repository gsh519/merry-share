"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  plan_id: string;
  name: string;
  display_name: string;
  price: number;
  currency: string;
  max_storage_gb: number;
  max_media_count: number | null;
  features: string[];
}

interface Subscription {
  subscription_id: string;
  wedding_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  cancel_at: string | null;
  canceled_at: string | null;
  plan: Plan;
}

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { user, getAccessToken } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSubscription();
    }
  }, [user]);

  const fetchSubscription = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("認証トークンが取得できませんでした");
      }

      const response = await fetch("/api/stripe/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setSubscription(null);
          return;
        }
        throw new Error("サブスクリプション情報の取得に失敗しました");
      }

      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async (immediate: boolean = false) => {
    if (!confirm(
      immediate
        ? "サブスクリプションを即座にキャンセルしますか?"
        : "サブスクリプションを期間終了時にキャンセルしますか?"
    )) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("認証トークンが取得できませんでした");
      }

      const response = await fetch(
        `/api/stripe/subscription?immediate=${immediate}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "キャンセルに失敗しました");
      }

      await fetchSubscription();
      alert(
        immediate
          ? "サブスクリプションをキャンセルしました"
          : "サブスクリプションは期間終了時にキャンセルされます"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!confirm("サブスクリプションを再開しますか?")) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("認証トークンが取得できませんでした");
      }

      const response = await fetch("/api/stripe/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "reactivate" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "再開に失敗しました");
      }

      await fetchSubscription();
      alert("サブスクリプションを再開しました");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateString));
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: "bg-green-100 text-green-800", text: "有効" },
      past_due: { color: "bg-yellow-100 text-yellow-800", text: "支払い期限切れ" },
      canceled: { color: "bg-red-100 text-red-800", text: "キャンセル済み" },
      incomplete: { color: "bg-gray-100 text-gray-800", text: "未完了" },
      trialing: { color: "bg-blue-100 text-blue-800", text: "トライアル中" },
    };

    const statusInfo = statusMap[status] || {
      color: "bg-gray-100 text-gray-800",
      text: status,
    };

    return (
      <span
        className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}
      >
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          サブスクリプションが見つかりません
        </p>
        <a
          href="/subscription/pricing"
          className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
        >
          プランを選択
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">
        サブスクリプション管理
      </h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {subscription.plan.display_name}
            </h3>
            <div className="mb-2">{getStatusBadge(subscription.status)}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">
              {formatPrice(
                Number(subscription.plan.price),
                subscription.plan.currency
              )}
            </div>
            <div className="text-gray-600">/ 月</div>
          </div>
        </div>

        <div className="border-t pt-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">プランの特徴:</h4>
          <ul className="space-y-2">
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-gray-700">
                ストレージ容量: {subscription.plan.max_storage_gb}GB
              </span>
            </li>
            {subscription.plan.max_media_count && (
              <li className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-700">
                  最大メディア数: {subscription.plan.max_media_count}
                </span>
              </li>
            )}
            {Array.isArray(subscription.plan.features) &&
              subscription.plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
          </ul>
        </div>

        <div className="border-t pt-6 mb-6">
          <h4 className="font-semibold text-gray-900 mb-4">
            サブスクリプション詳細:
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600">現在の期間開始日</dt>
              <dd className="text-gray-900 font-medium">
                {formatDate(subscription.current_period_start)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">現在の期間終了日</dt>
              <dd className="text-gray-900 font-medium">
                {formatDate(subscription.current_period_end)}
              </dd>
            </div>
            {subscription.cancel_at_period_end && (
              <div className="md:col-span-2">
                <dt className="text-sm text-gray-600">キャンセル予定日</dt>
                <dd className="text-red-600 font-medium">
                  {formatDate(subscription.current_period_end)}
                  <span className="ml-2 text-sm">
                    (期間終了時にキャンセルされます)
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="border-t pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">アクション:</h4>
          <div className="flex flex-wrap gap-4">
            {subscription.cancel_at_period_end ? (
              <button
                onClick={handleReactivateSubscription}
                disabled={actionLoading}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {actionLoading ? "処理中..." : "サブスクリプションを再開"}
              </button>
            ) : (
              subscription.status === "active" && (
                <button
                  onClick={() => handleCancelSubscription(false)}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {actionLoading
                    ? "処理中..."
                    : "期間終了時にキャンセル"}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
