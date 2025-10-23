import SubscriptionManager from "@/components/subscription/SubscriptionManager";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ManageSubscriptionPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <SubscriptionManager />
      </div>
    </ProtectedRoute>
  );
}
