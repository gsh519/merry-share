import { useEffect, useState } from "react";
import { Heart, Download, Calendar } from "lucide-react";
import Image from "next/image";

interface Media {
  id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  uploaded_by?: string;
  created_at: Date;
}

export function MediaGallery() {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      const response = await fetch("/api/media");
      const data = await response.json();
      console.log("API Response:", data);
      console.log("Is Array:", Array.isArray(data));
      setMedia(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading media:", error);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-200 border-t-rose-400"></div>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <Heart className="w-16 h-16 text-rose-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">まだ写真がありません</h2>
        <p className="text-gray-500 text-center">素敵な思い出の写真を追加してください</p>
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 p-4 max-w-7xl mx-auto">
      {Array.isArray(media) && media.map((item) => <MediaCard key={item.id} media={item} />)}
    </div>
  );
}

function MediaCard({ media }: { media: Media }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative mb-4 break-inside-avoid group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300">
        <Image
          src={media.thumbnail_url || media.url}
          alt={media.title || "メディア"}
          width={400}
          height={300}
          className="w-full h-auto object-cover"
          loading="lazy"
        />

        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              {media.title && <h3 className="font-medium text-lg mb-1">{media.title}</h3>}
              {media.description && <p className="text-sm text-white/90 mb-3">{media.description}</p>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(media.created_at).toLocaleDateString("ja-JP")}</span>
                </div>

                <div className="flex gap-2">
                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {media.uploaded_by && (
        <div className="mt-2 px-2">
          <p className="text-xs text-gray-500">撮影: {media.uploaded_by}</p>
        </div>
      )}
    </div>
  );
}
