import { useEffect, useState } from "react";
import type {
  ChipStatus,
  Preferences,
  Video,
  YouTubePreferences,
} from "../types";
import * as Slider from "@radix-ui/react-slider";
import VideoList from "./VideoList";
import ClusteredVideoList from "./ClusterVideoList";
import VideoPlayer from "./VideoPlayer";
import SyncWatchLaterButton from "./SyncWatchLaterButton";
import {
  getAllVideos,
  getPreferences,
  savePreferences,
  setVideoStatus,
} from "../db/queries";

const STATUS_FILTERS: { label: string; statuses: ChipStatus[] }[] = [
  { label: "To watch", statuses: ["queued", "in_progress"] },
  { label: "Later", statuses: ["deferred"] },
  { label: "Watched", statuses: ["completed"] },
  { label: "Skipped", statuses: ["skipped"] },
];

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

export default function YTWatchList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [search, setSearch] = useState("");
  const [showAICategories, setShowAICategories] = useState(false);
  const [clusters, setClusters] = useState<{ [label: string]: string[] }>({});
  const [selectedVideo, setSelectedVideo] = useState<string>("");

  useEffect(() => {
    async function load() {
      const allVideos = await getAllVideos();
      setVideos(allVideos);
    }
    load();
  }, [loading]);

  useEffect(() => {
    getPreferences().then(setPreferences);
  }, []);

  if (!preferences) return null;

  const { sortBy, sortOrder, thumbnailsFirst, durationRange, statusFilter } =
    preferences.youtube;

  function updatePreferences(changes: Partial<YouTubePreferences>) {
    if (!preferences) return;
    const next = {
      ...preferences,
      youtube: { ...preferences.youtube, ...changes },
    };
    setPreferences(next);
    savePreferences(next);
  }

  function toggleStatusFilter(statuses: ChipStatus[]) {
    const isOn = statuses.every((s) => statusFilter.includes(s));
    updatePreferences({
      statusFilter: isOn
        ? statusFilter.filter((s) => !statuses.includes(s))
        : [...statusFilter, ...statuses],
    });
  }

  async function updateStatus(id: string, status: ChipStatus) {
    const updated = await setVideoStatus(id, status);
    if (!updated) return;
    setVideos((current) => current.map((v) => (v.id === id ? updated : v)));
  }

  const filtered = videos?.filter((v) => {
    const query = search.toLowerCase();
    const mins = parseDurationToMinutes(v.duration);
    return (
      statusFilter.includes(v.status) &&
      (v.title.toLowerCase().includes(query) ||
        v.channel.toLowerCase().includes(query)) &&
      mins >= durationRange[0] &&
      mins <= durationRange[1]
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (thumbnailsFirst) {
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
    0,
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
        onChange={(e) =>
          updatePreferences({ sortBy: e.target.value as typeof sortBy })
        }
      >
        <option value="title">Alphabetical</option>
        <option value="channel">Channel</option>
        <option value="duration">Duration</option>
      </select>
      <select
        className="border p-2"
        value={sortOrder}
        onChange={(e) =>
          updatePreferences({
            sortOrder: e.target.value as typeof sortOrder,
          })
        }
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
      <button
        className="border p-2 rounded"
        onClick={() => updatePreferences({ thumbnailsFirst: !thumbnailsFirst })}
      >
        {thumbnailsFirst
          ? "Thumbnails Required First"
          : "Some Thumbnails Missing"}
      </button>
      <SyncWatchLaterButton loading={loading} setLoading={setLoading} />
      <button
        hidden={true} //TODO: Commented out for the time being - will add back in once AI categorization is properly setup
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

      <div className="flex gap-2 my-2">
        {STATUS_FILTERS.map(({ label, statuses }) => {
          const on = statuses.every((s) => statusFilter.includes(s));
          return (
            <label key={label} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggleStatusFilter(statuses)}
              />
              {label}
            </label>
          );
        })}
      </div>

      {/* Slider Control */}
      {sortBy == "duration" && (
        <div className="space-y-2">
          <p className="font-medium">
            Duration filter: {durationRange[0]}–{durationRange[1]} min
          </p>
          <Slider.Root
            className="relative flex items-center select-none touch-none w-[300px] h-[40px]"
            value={durationRange}
            min={0}
            max={180} // 3h max
            step={1}
            onValueChange={(val) =>
              updatePreferences({ durationRange: val as [number, number] })
            }
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
      <div className="font-semibold">Total Video Count: {sorted.length}</div>
      {selectedVideo != "" && <VideoPlayer url={selectedVideo} />}
      {showAICategories ? (
        <ClusteredVideoList
          videos={sorted}
          clusters={clusters}
          setSelectedVideo={setSelectedVideo}
          onStatusChange={updateStatus}
        />
      ) : (
        <VideoList
          videos={sorted}
          setSelectedVideo={setSelectedVideo}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  );
}
