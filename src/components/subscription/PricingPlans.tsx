"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Plan {
  plan_id: string;
  name: string;
  display_name: string;
  description: string | null;
  price: number;
  currency: string;
  max_storage_gb: number;
  max_media_count: number | null;
  features: string[];
}

interface PricingPlansProps {
  weddingId?: string;
  onSuccess?: () => void;
}

export default function PricingPlans({
  weddingId,
  onSuccess,
}: PricingPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { user, getAccessToken } = useAuth();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/stripe/plans");
      if (!response.ok) {
        throw new Error("プランの取得に失敗しました");
      }
      const data = await response.json();
      setPlans(data.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    if (!user || !weddingId) {
      setError("ログインしてください");
      return;
    }

    setIsCheckingOut(true);
    setSelectedPlan(planId);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("認証トークンが取得できませんでした");
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          weddingId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "チェックアウトに失敗しました");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("チェックアウトURLが取得できませんでした");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setIsCheckingOut(false);
      setSelectedPlan(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPlans}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            プランを選択
          </h2>
          <p className="text-lg text-gray-600">
            あなたの結婚式に最適なプランをお選びください
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.plan_id}
              className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.display_name}
                </h3>
                {plan.description && (
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                )}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(Number(plan.price), plan.currency)}
                  </span>
                  <span className="text-gray-600 ml-2">/月</span>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    プランの特徴:
                  </h4>
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
                        ストレージ容量: {plan.max_storage_gb}GB
                      </span>
                    </li>
                    {plan.max_media_count && (
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
                          最大メディア数: {plan.max_media_count}
                        </span>
                      </li>
                    )}
                    {Array.isArray(plan.features) &&
                      plan.features.map((feature, index) => (
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

                <button
                  onClick={() => handleCheckout(plan.plan_id)}
                  disabled={isCheckingOut && selectedPlan === plan.plan_id}
                  className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isCheckingOut && selectedPlan === plan.plan_id
                    ? "処理中..."
                    : "このプランを選択"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
