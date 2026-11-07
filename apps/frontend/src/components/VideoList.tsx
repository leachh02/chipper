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
  return (
    <div>
      <div className="grid grid-cols-5 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {videos.map((v) => (
          <div
            key={v.id}
            className={`flex flex-col ${
              v.status === "completed" || v.status === "skipped"
                ? "opacity-40"
                : ""
            }`}
          >
            <button
              type="button"
              className="p-0 border-0 bg-transparent"
              aria-label={`Play ${v.title}`}
              onClick={() => onSelect(v)}
            >
              <img
                src={thumbnailUrl(v.id)}
                alt=""
                className="w-full aspect-video object-cover rounded"
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
            </button>
            <div>
              <h3 className="text-base font-semibold overflow-hidden text-ellipsis">
                {v.title}
              </h3>
              <p className="text-sm text-gray-600">
                {v.channel} • {v.duration || "–"}
              </p>
              <ChipActions
                status={v.status}
                labels={VIDEO_ACTIONS}
                onChange={(status) => onStatusChange(v.id, status)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
