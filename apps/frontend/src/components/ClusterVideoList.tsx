import { useState } from "react";
import type { ChipStatus, Video } from "../types";
import VideoList from "./VideoList";

interface Props {
  videos: Video[];
  clusters: { [label: string]: string[] };
  setSelectedVideo: (url: string) => void;
  onStatusChange: (id: string, status: ChipStatus) => void;
}
export default function ClusteredVideoList({
  videos,
  clusters,
  setSelectedVideo,
  onStatusChange,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // merge videos with clusters
  const clusterMap: Record<string, Video[]> = {};
  for (const [label, ids] of Object.entries(clusters)) {
    clusterMap[label] = ids
      .map((id) => videos.find((v) => v.id === id))
      .filter(Boolean) as Video[];
  }

  return (
    <div className="w-full">
      {Object.entries(clusterMap).map(([label, vids]) => (
        <div key={label} className="border rounded-xl shadow p-3">
          <button
            className="w-full text-left font-bold text-lg flex justify-between items-center"
            onClick={() => setExpanded(expanded === label ? null : label)}
          >
            {label} <span>{expanded === label ? "▲" : "▼"}</span>
          </button>

          {expanded === label && (
            <VideoList
              videos={vids}
              setSelectedVideo={setSelectedVideo}
              onStatusChange={onStatusChange}
            />
          )}
        </div>
      ))}
    </div>
  );
}
