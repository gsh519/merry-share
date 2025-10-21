import { MediaGallery } from "@/components/MediaGallery";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomeClient from "@/components/HomeClient";

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeClient>
        <MediaGallery />
      </HomeClient>
    </ProtectedRoute>
  );
}
