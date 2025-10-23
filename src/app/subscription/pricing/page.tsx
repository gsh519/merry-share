"use client";

import PricingPlans from "@/components/subscription/PricingPlans";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";

export default function PricingPage() {
  const { user } = useAuth();
  const [weddingId, setWeddingId] = useState<string | undefined>();

  useEffect(() => {
    const fetchWeddingId = async () => {
      if (!user) return;

      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setWeddingId(data.wedding_id);
        }
      } catch (error) {
        console.error("Error fetching wedding ID:", error);
      }
    };

    fetchWeddingId();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <PricingPlans weddingId={weddingId} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
