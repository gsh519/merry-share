"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

export function FloatingUploadButton() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsUploadOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl hover:from-rose-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      <ImageUpload isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
