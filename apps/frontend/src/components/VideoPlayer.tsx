import { useEffect } from "react";
import ReactPlayer from "react-player";
import type { ChipStatus, Video } from "../types";

type Props = {
  video: Video;
  nextVideo?: Video;
  onNext: () => void;
  onEnded: (id: string) => void;
  onClose: () => void;
  onStatusChange: (id: string, status: ChipStatus) => void;
};

export default function VideoPlayer({
  video,
  nextVideo,
  onNext,
  onEnded,
  onClose,
  onStatusChange,
}: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl"
        role="dialog"
        aria-label={video.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-2 text-white">
          <h2 className="font-semibold truncate">{video.title}</h2>
          <div className="flex items-center gap-3 shrink-0">
            {nextVideo && (
              <button
                type="button"
                className="text-sm px-2 py-1 rounded"
                title={`Next: ${nextVideo.title}`}
                onClick={onNext}
              >
                Next ›
              </button>
            )}
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm underline"
            >
              Open on YouTube
            </a>
            <button
              type="button"
              className="px-2 py-1 rounded"
              aria-label="Close player"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="aspect-video">
          <ReactPlayer
            // A fresh player per video, so the next one starts from the top
            key={video.id}
            src={video.url}
            width="100%"
            height="100%"
            controls
            playing
            onStart={() => {
              if (video.status === "queued") {
                onStatusChange(video.id, "in_progress");
              }
            }}
            // Marks it watched and moves on to the next video
            onEnded={() => onEnded(video.id)}
          />
        </div>
      </div>
    </div>
  );
}
