import { Heart } from "lucide-react";
import { MediaGallery } from "@/components/MediaGallery";
import { FloatingUploadButton } from "@/components/FloatingUploadButton";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-rose-400 to-pink-400 p-2 rounded-xl shadow-sm">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                  Merry Share
                </h1>
                <p className="text-xs text-gray-500">大切な思い出を共有しよう</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pb-8">
        <MediaGallery />
      </main>

      <FloatingUploadButton />
    </div>
  );
}
