import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import type { ChipStatus, Video } from "../types";

// The YouTube player element behind react-player
type YouTubeElement = HTMLVideoElement & {
  loadComplete?: Promise<void>;
  api?: { loadVideoById(id: string): void } | null;
};

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
  // Which video you paused. react-player plays whenever it's told to play
  // and the video is paused, on every render, so this has to follow what
  // you do in the player, or a paused video would start again by itself.
  const [pausedId, setPausedId] = useState<string | null>(null);
  const paused = pausedId === video.id;

  // One YouTube player for every video you watch here, with each next video
  // loaded into it. A new player would replace the one that's fullscreen,
  // and its fullscreen button would then stop working.
  const playerRef = useRef<YouTubeElement>(null);
  const [firstUrl] = useState(video.url);
  const loadedId = useRef(video.id);
  useEffect(() => {
    const player = playerRef.current;
    if (!player || loadedId.current === video.id) return;
    loadedId.current = video.id;
    player.loadComplete?.then(() => player.api?.loadVideoById(video.id));
  }, [video.id]);

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
              className="link text-sm"
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
            ref={playerRef}
            // Kept as the first video's, since a new address makes a new player
            src={firstUrl}
            width="100%"
            height="100%"
            controls
            playing={!paused}
            onPlay={() => setPausedId(null)}
            onPause={() => setPausedId(video.id)}
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
