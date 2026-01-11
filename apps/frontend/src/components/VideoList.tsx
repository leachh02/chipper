// VideoList.tsx
import type { Video } from "../types";
import fallbackThumbnail from "../assets/fallback-thumbnail.png";

interface Props {
  videos: Video[];
  setSelectedVideo: (url: string) => void;
}

export default function VideoList({ videos, setSelectedVideo }: Props) {
  return (
    <div>
      <div className="grid grid-cols-5 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {videos.map((v) => (
          <div key={v.index} className="flex flex-col ">
            <a
              onClick={() => setSelectedVideo(v.link)}
              target="_blank"
              rel="noreferrer"
            >
              <img src={v.thumbnail || fallbackThumbnail} />
            </a>
            <div>
              <h3 className="text-base font-semibold overflow-hidden text-ellipsis">
                {v.title}
              </h3>
              <p className="text-sm text-gray-600">
                {v.channel} • {v.duration}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
