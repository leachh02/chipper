// VideoList.tsx
import { useState } from "react";
import type { Video } from "../types";
import * as Slider from "@radix-ui/react-slider";
import VideoList from "./VideoList";
import ClusteredVideoList from "./ClusterVideoList";
import VideoPlayer from "./VideoPlayer";

interface Props {
  videos: Video[];
}

const toSeconds = (d: string) =>
  d.split(":").reduce((acc, val) => acc * 60 + parseInt(val), 0);

// utils/parseDuration.ts
function parseDurationToMinutes(duration: string): number {
  const parts = duration.split(":").map(Number).reverse();
  let totalMinutes = 0;

  if (parts[0]) totalMinutes += parts[0] / 60; // seconds -> minutes
  if (parts[1]) totalMinutes += parts[1]; // minutes
  if (parts[2]) totalMinutes += parts[2] * 60; // hours -> minutes

  return totalMinutes;
}

async function categorizeVideos(videoData: Video[]) {
  const response = await fetch("/api/categorise", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videos: videoData }),
  });

  if (!response.ok) {
    throw new Error("AI categorizer request failed");
  }

  const categories = await response.json();
  return categories;
}

export default function YTWatchList({ videos }: Props) {
  const [sortBy, setSortBy] = useState<"title" | "channel" | "duration">(
    "duration"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [hasThumbnails, setHasThumbnails] = useState(true);
  // Duration filter range (minutes)
  const [range, setRange] = useState<[number, number]>([0, 120]); // 0–120 min
  const [showAICategories, setShowAICategories] = useState(false);
  const [clusters, setClusters] = useState<{ [label: string]: number[] }>({});
  const [selectedVideo, setSelectedVideo] = useState<string>("");

  const filtered = videos.filter((v) => {
    const query = search.toLowerCase();
    const mins = parseDurationToMinutes(v.duration);
    return (
      (v.title.toLowerCase().includes(query) ||
        v.channel.toLowerCase().includes(query)) &&
      mins >= range[0] &&
      mins <= range[1]
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (hasThumbnails) {
      if (!!a.thumbnail && !b.thumbnail) return -1; // a first
      if (!a.thumbnail && !!b.thumbnail) return 1; // b first
    }
    let cmp = 0;
    if (sortBy === "title")
      cmp = a.title
        .trim()
        .localeCompare(b.title.trim(), undefined, { sensitivity: "base" });
    else if (sortBy === "channel")
      cmp = a.channel
        .trim()
        .localeCompare(b.channel.trim(), undefined, { sensitivity: "base" });
    else if (sortBy === "duration")
      cmp = toSeconds(a.duration) - toSeconds(b.duration);

    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Total watch time in seconds
  const totalSeconds = sorted.reduce(
    (sum, v) => sum + toSeconds(v.duration),
    0
  );

  // Format total watch time as HH:MM:SS
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const formattedTotal = `${hours}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div>
      <input
        type="text"
        className="border p-2 flex-grow"
        placeholder="Search by title or channel..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        className="border p-2 m-2"
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as any)}
      >
        <option value="title">Alphabetical</option>
        <option value="channel">Channel</option>
        <option value="duration">Duration</option>
      </select>
      <select
        className="border p-2"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value as any)}
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
      <button
        className="border p-2 rounded"
        onClick={() => setHasThumbnails(!hasThumbnails)}
      >
        {hasThumbnails
          ? "Thumbnails Required First"
          : "Some Thumbnails Missing"}
      </button>
      <button
        onClick={() => window.open("https://www.youtube.com/playlist?list=WL")}
      >
        Open Watch Later
      </button>
      <button
        onClick={async () => {
          if (showAICategories) {
            setShowAICategories(false);
            return;
          } else {
            const categories = await categorizeVideos(videos);
            setShowAICategories(true);
            setClusters(categories);
          }
        }}
      >
        AI categories
      </button>

      {/* Slider Control */}
      {sortBy == "duration" && (
        <div className="space-y-2">
          <p className="font-medium">
            Duration filter: {range[0]}–{range[1]} min
          </p>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-[300px] h-[40px]"
            value={range}
            min={0}
            max={180} // 3h max
            step={1}
            onValueChange={(val) => setRange(val as [number, number])}
          >
            <Slider.Track className="relative h-[6px] grow rounded-full bg-gray-500">
              <Slider.Range className="absolute h-full rounded-full bg-white" />
            </Slider.Track>
            <Slider.Thumb className="block w-[20px] h-[20px] bg-black border border-gray-400 rounded-full shadow" />
            <Slider.Thumb className="block w-[20px] h-[20px] bg-black border border-gray-400 rounded-full shadow" />
          </Slider.Root>
        </div>
      )}

      <div className="font-semibold">Total Watch Time: {formattedTotal}</div>
      <div className="font-semibold">Total Video Count: {videos.length}</div>
      {selectedVideo != "" && <VideoPlayer url={selectedVideo} />}
      {showAICategories ? (
        <ClusteredVideoList
          videos={sorted}
          clusters={clusters}
          setSelectedVideo={setSelectedVideo}
        />
      ) : (
        <VideoList videos={sorted} setSelectedVideo={setSelectedVideo} />
      )}
    </div>
  );
}
