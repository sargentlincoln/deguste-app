import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getVideos } from '@/lib/api/restaurants';
import { Video } from '@/lib/types';
import { getCoverPhotoUrl } from '@/lib/photoUtils';
import { useAuth } from '@/contexts/AuthContext'; // for future use with favorites
import { useLocation } from '@/contexts/LocationContext';

export default function Shorts() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { latitude, longitude } = useLocation();

  useEffect(() => {
    async function loadVideos() {
      try {
        const data = await getVideos(latitude ?? undefined, longitude ?? undefined);
        setVideos(data);
      } catch (err) {
        console.error("Failed to load videos", err);
      } finally {
        setLoading(false);
      }
    }
    loadVideos();
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar">
      <Link to="/" className="fixed top-5 left-5 z-50 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 shadow-lg">
        <span className="material-icons">arrow_back</span>
      </Link>

      {videos.map((video) => (
        <ShortItem key={video.id} video={video} />
      ))}

      {videos.length === 0 && (
        <div className="h-screen w-full flex items-center justify-center text-gray-500">
          Nenhum vídeo encontrado.
        </div>
      )}
    </div>
  );
}

const ShortItem: React.FC<{ video: Video }> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(e => console.log("Autoplay blocked", e));
          setIsPlaying(true);
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  }

  return (
    <div className="relative w-full h-screen snap-start bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Video or Photo Element */}
      {video.is_photo || !video.video_url ? (
        <img
          className="w-full h-full object-cover"
          src={video.thumbnail_url}
          alt={video.title}
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={video.video_url}
          loop
          muted={muted}
          playsInline
          onClick={togglePlay}
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-50% to-black/95 pointer-events-none"></div>

      {/* Top Bar - Live Badge */}
      <div className="absolute top-0 left-0 right-0 pt-16 px-5 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <span className="text-sm font-bold text-white tracking-wide truncate max-w-[150px]">{video.title}</span>
        </div>
        <button onClick={toggleMute} className="pointer-events-auto w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-black/60 transition-colors">
          <span className="material-icons text-white">{muted ? 'volume_off' : 'volume_up'}</span>
        </button>
      </div>

      {/* Right Action Column */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-6 mt-12">
        {/* Avatar */}
        {video.restaurant && (
          <Link to={`/restaurant/${video.restaurant.id}`} className="relative mb-2 block">
            <div className="w-14 h-14 rounded-full bg-[#2a2020] border-2 border-primary/60 flex items-center justify-center overflow-hidden shadow-lg">
              {/* Placeholder avatar logic if no image, using first letter or category icon */}
              {getCoverPhotoUrl(video.restaurant.photos) ? (
                <img src={getCoverPhotoUrl(video.restaurant.photos)} alt={video.restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🍽️</span>
              )}
            </div>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-md border border-black">
              <span className="text-white text-[11px] font-bold leading-none">+</span>
            </div>
          </Link>
        )}

        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10 group-active:scale-90 transition-transform">
            <span className="material-icons text-white text-[28px] group-hover:text-primary transition-colors">favorite</span>
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">{video.likes_count}</span>
        </div>

        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10 group-active:scale-90 transition-transform">
            <span className="material-icons text-white text-[28px] group-hover:text-primary transition-colors">restaurant_menu</span>
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">Menu</span>
        </div>

        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10 group-active:scale-90 transition-transform">
            <span className="material-icons text-white text-[28px] group-hover:text-primary transition-colors">bookmark_border</span>
          </div>
          <span className="text-[11px] font-semibold text-white drop-shadow-md">Save</span>
        </div>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-24 pointer-events-none">
        {/* Restaurant Name & Title */}
        <h2 className="text-[28px] font-extrabold text-white leading-[1.1] tracking-tight mb-2 drop-shadow-lg max-w-[75%]">
          {video.restaurant?.name || "Restaurante"}
        </h2>
        <p className="text-sm text-gray-200 font-medium leading-relaxed mb-4 max-w-[80%] line-clamp-2">
          {video.description || video.title}
        </p>

        {/* Rating & Distance */}
        {video.restaurant && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1">
              <span className="material-icons text-yellow-400 text-[18px]">star</span>
              <span className="text-base font-bold text-white">{video.restaurant.rating_avg}</span>
              <span className="text-sm text-gray-400 font-medium">({video.restaurant.rating_count})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-xs text-white border border-white/10">
                {video.restaurant.categories[0]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
