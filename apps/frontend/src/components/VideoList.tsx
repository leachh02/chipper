import type { ChipStatus, Video } from "../types";
import fallbackThumbnail from "../assets/fallback-thumbnail.png";
import ChipActions from "./ChipActions";
import { thumbnailUrl } from "../utils/youtube";

interface Props {
  videos: Video[];
  onSelect: (video: Video) => void;
  onStatusChange: (id: string, status: ChipStatus) => void;
}

const VIDEO_ACTIONS: Partial<Record<ChipStatus, string>> = {
  completed: "Watched",
  deferred: "Later",
  skipped: "Skip",
};

export default function VideoList({
  videos,
  onSelect,
  onStatusChange,
}: Props) {
  if (videos.length === 0) {
    return (
      <p className="card p-6 text-center text-sm text-muted">
        No videos match. Sync Watch Later, or change the filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:gap-4">
      {videos.map((v) => (
        <div
          key={v.id}
          className={`card flex flex-col overflow-hidden transition-opacity ${
            v.status === "completed" || v.status === "skipped" ? "opacity-40" : ""
          }`}
        >
          <button
            type="button"
            className="relative block"
            aria-label={`Play ${v.title}`}
            onClick={() => onSelect(v)}
          >
            <img
              src={thumbnailUrl(v.id)}
              alt=""
              loading="lazy"
              className="w-full aspect-video object-cover bg-surface-2"
              onError={(e) => {
                e.currentTarget.src = fallbackThumbnail;
              }}
              onLoad={(e) => {
                // YouTube serves a 120px placeholder for missing videos
                if (e.currentTarget.naturalWidth === 120) {
                  e.currentTarget.src = fallbackThumbnail;
                }
              }}
            />
            {v.duration && (
              <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white">
                {v.duration}
              </span>
            )}
          </button>
          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="min-w-0">
              <h3 className="text-sm font-medium leading-snug line-clamp-2" title={v.title}>
                {v.title}
              </h3>
              <p className="truncate text-xs text-muted">{v.channel}</p>
            </div>
            <div className="mt-auto">
              <ChipActions
                status={v.status}
                labels={VIDEO_ACTIONS}
                onChange={(status) => onStatusChange(v.id, status)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
