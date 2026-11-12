import { useCallback, useEffect, useState } from "react";
import type {
  ChipStatus,
  Preferences,
  Video,
  YouTubePreferences,
} from "../types";
import DurationRange from "./DurationRange";
import { formatRuntime, inDurationRange } from "../utils/format";
import VideoList from "./VideoList";
import VideoPlayer from "./VideoPlayer";
import WatchLaterActions from "./WatchLaterActions";
import { durationToSeconds, sortVideos } from "../utils/youtube";
import {
  getAllVideos,
  getPreferences,
  savePreferences,
  setVideoStatus,
} from "../db/queries";
import { useRemoteChanges } from "../db/useRemoteChanges";
import TopicControls from "../topics/TopicControls";
import TopicSections from "../topics/TopicSections";
import { useTopics } from "../topics/useTopics";

const MAX_VIDEO_MINUTES = 180;

const STATUS_FILTERS: { label: string; statuses: ChipStatus[] }[] = [
  { label: "To watch", statuses: ["queued", "in_progress"] },
  { label: "Later", statuses: ["deferred"] },
  { label: "Watched", statuses: ["completed"] },
  { label: "Skipped", statuses: ["skipped"] },
];

// What a sort depends on, where it isn't obvious
const SORT_NOTES: Partial<Record<YouTubePreferences["sortBy"], string>> = {
  addedToWatchLater:
    "Follows the order of Watch Later on YouTube, so keep it sorted by date added, newest first.",
  views: "Views are as of each video's latest sync. A full sync fills in any that are missing.",
  uploaded:
    "Upload dates are approximate, from YouTube's \"3 years ago\". A full sync fills in any that are missing.",
};

export default function YTWatchList() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [search, setSearch] = useState("");
  const topics = useTopics("video");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setVideos(await getAllVideos());
  }, []);
  const closePlayer = useCallback(() => setSelectedId(null), []);

  useEffect(() => {
    reload();
  }, [reload]);
  useRemoteChanges(reload);

  useEffect(() => {
    getPreferences().then(setPreferences);
  }, []);

  if (!preferences) return null;

  const { sortBy, sortOrder, durationRange, statusFilter, groupByTopic } =
    preferences.youtube;
  const selectedVideo = videos.find((v) => v.id === selectedId);

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
    const mins = durationToSeconds(v.duration) / 60;
    return (
      !v.removedAt &&
      statusFilter.includes(v.status) &&
      (v.title.toLowerCase().includes(query) ||
        v.channel.toLowerCase().includes(query)) &&
      inDurationRange(mins, durationRange, MAX_VIDEO_MINUTES)
    );
  });

  const sorted = sortVideos(filtered, sortBy, sortOrder);

  // The next video in the list as it's currently sorted and filtered
  const nextVideo = selectedId
    ? sorted[sorted.findIndex((v) => v.id === selectedId) + 1]
    : undefined;

  async function finishVideo(id: string) {
    const next = nextVideo;
    await updateStatus(id, "completed");
    setSelectedId(next?.id ?? null);
  }

  // Total watch time in seconds
  const totalSeconds = sorted.reduce(
    (sum, v) => sum + durationToSeconds(v.duration),
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Watch Later</h1>
          <p className="text-sm text-muted">
            {sorted.length} {sorted.length === 1 ? "video" : "videos"} ·{" "}
            {formatRuntime(totalSeconds * 1000)}
          </p>
        </div>
        <WatchLaterActions videos={videos} onChange={reload} />
      </div>

      <div className="card my-4 flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            className="input min-w-0 flex-1 basis-48"
            placeholder="Search by title or channel"
            aria-label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) =>
              updatePreferences({ sortBy: e.target.value as typeof sortBy })
            }
          >
            <option value="addedToWatchLater">Added to Watch Later</option>
            <option value="addedToChipper">Added to Chipper</option>
            <option value="title">Title</option>
            <option value="channel">Channel</option>
            <option value="duration">Duration</option>
            <option value="views">Views</option>
            <option value="uploaded">Uploaded</option>
          </select>
          <select
            className="input"
            aria-label="Sort order"
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
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {STATUS_FILTERS.map(({ label, statuses }) => {
            const on = statuses.every((s) => statusFilter.includes(s));
            return (
              <label key={label} className="flex items-center gap-2">
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

        <TopicControls
          state={topics}
          grouped={!!groupByTopic}
          onGroupedChange={(grouped) => updatePreferences({ groupByTopic: grouped })}
        />

        {SORT_NOTES[sortBy] && <p className="text-sm text-muted">{SORT_NOTES[sortBy]}</p>}

        {sortBy == "duration" && (
          <DurationRange
            label="Duration"
            value={durationRange}
            max={MAX_VIDEO_MINUTES}
            onChange={(range) => updatePreferences({ durationRange: range })}
          />
        )}
      </div>

      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          nextVideo={nextVideo}
          onNext={() => setSelectedId(nextVideo?.id ?? null)}
          onEnded={finishVideo}
          onClose={closePlayer}
          onStatusChange={updateStatus}
        />
      )}
      {groupByTopic && topics.topics ? (
        <TopicSections
          items={sorted}
          topics={topics.topics}
          runtimeMs={(v) => durationToSeconds(v.duration) * 1000}
        >
          {(videos) => (
            <VideoList
              videos={videos}
              onSelect={(v) => setSelectedId(v.id)}
              onStatusChange={updateStatus}
            />
          )}
        </TopicSections>
      ) : (
        <VideoList
          videos={sorted}
          onSelect={(v) => setSelectedId(v.id)}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  );
}
