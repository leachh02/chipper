import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { FaCheck, FaForward, FaPodcast, FaRecordVinyl, FaYoutube } from "react-icons/fa";
import ChipActions from "../components/ChipActions";
import { SPOTIFY } from "../config";
import {
  getAllAlbums,
  getAllEpisodes,
  getAllVideos,
  getPreferences,
  savePreferences,
  setAlbumStatus,
  setEpisodeStatus,
  setVideoStatus,
} from "../db/queries";
import type { ChipStatus, ItemType, Preferences, QueuePreferences } from "../types";
import { formatRuntime } from "../utils/format";
import {
  albumItems,
  buildQueue,
  episodeItems,
  tier,
  videoItems,
  type QueueItem,
} from "../utils/queue";

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

const ALL_SOURCES: { type: ItemType; label: string; icon: ReactNode }[] = [
  { type: "video", label: "Watch Later", icon: <FaYoutube /> },
  { type: "album", label: "Albums", icon: <FaRecordVinyl /> },
  { type: "episode", label: "Podcasts", icon: <FaPodcast /> },
];

const SOURCES = ALL_SOURCES.filter((source) => SPOTIFY.enabled || source.type === "video");

const QUEUE_ACTIONS: Partial<Record<ChipStatus, string>> = {
  completed: "Done",
  skipped: "Skip",
};

const QUEUE_ICONS = {
  completed: <FaCheck />,
  skipped: <FaForward />,
};

const SET_STATUS = {
  video: setVideoStatus,
  album: setAlbumStatus,
  episode: setEpisodeStatus,
};

function minutes(n: number) {
  return formatRuntime(n * 60000);
}

export default function QueuePage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  // Everything waiting in the backlog, read when the page opens. Kept as is
  // while you work through a session, so the queue doesn't reshuffle.
  const [pool, setPool] = useState<QueueItem[]>([]);
  // Statuses changed during this session, by item key
  const [marked, setMarked] = useState<Record<string, ChipStatus>>({});

  async function load() {
    const [videos, albums, episodes, prefs] = await Promise.all([
      getAllVideos(),
      getAllAlbums(),
      getAllEpisodes(),
      getPreferences(),
    ]);
    setPool([...videoItems(videos), ...albumItems(albums), ...episodeItems(episodes)]);
    setMarked({});
    setPreferences(prefs);
  }

  useEffect(() => {
    load();
  }, []);

  const settings = useMemo(
    () =>
      preferences && {
        ...preferences.queue,
        // Albums and podcasts only exist where Spotify is set up
        sources: preferences.queue.sources.filter((s) => SOURCES.some((x) => x.type === s)),
      },
    [preferences],
  );
  const queue = useMemo(
    () =>
      settings
        ? buildQueue(
            pool.filter((item) => settings.sources.includes(item.type)),
            settings.minutes,
          )
        : [],
    [pool, settings],
  );

  if (!preferences || !settings) return <div className="p-6">Loading...</div>;

  function update(changes: Partial<QueuePreferences>) {
    const next = { ...preferences!, queue: { ...settings!, ...changes } };
    setPreferences(next);
    savePreferences(next);
  }

  async function changeStatus(item: QueueItem, status: ChipStatus) {
    // Undoing puts it back how it was, e.g. a part-listened episode stays started
    const next = status === "queued" ? item.status : status;
    await SET_STATUS[item.type](item.id, next);
    setMarked((all) => ({ ...all, [item.key]: next }));
  }

  const statusOf = (item: QueueItem) => marked[item.key] ?? item.status;
  const plannedMinutes = queue.reduce((sum, item) => sum + item.minutes, 0);
  const clearedMinutes = queue
    .filter((item) => statusOf(item) === "completed")
    .reduce((sum, item) => sum + item.minutes, 0);
  const available = pool.filter((item) => settings.sources.includes(item.type)).length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Chip session</h1>
        <Link to="/" className="text-sm underline">
          Home
        </Link>
      </div>

      <h2 className="font-semibold mt-4 mb-2">How long have you got?</h2>
      <div className="flex flex-wrap items-center gap-2">
        {QUICK_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={settings.minutes === m}
            className={`border rounded px-3 py-1 text-sm ${
              settings.minutes === m
                ? "bg-gray-800 text-white border-gray-800 dark:bg-white dark:text-black dark:border-white"
                : "border-gray-400"
            }`}
            onClick={() => update({ minutes: m })}
          >
            {minutes(m)}
          </button>
        ))}
        <label className="flex items-center gap-1 text-sm">
          or
          <input
            type="number"
            min={1}
            max={1440}
            aria-label="Minutes"
            className="border p-1 w-20"
            value={settings.minutes}
            onChange={(e) => {
              const value = Math.round(Number(e.target.value));
              if (value > 0) update({ minutes: Math.min(value, 1440) });
            }}
          />
          min
        </label>
      </div>

      <div className="flex flex-wrap gap-3 my-3 text-sm">
        {SOURCES.map(({ type, label, icon }) => (
          <label key={type} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.sources.includes(type)}
              onChange={() =>
                update({
                  sources: settings.sources.includes(type)
                    ? settings.sources.filter((s) => s !== type)
                    : [...settings.sources, type],
                })
              }
            />
            {icon}
            {label}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 my-3">
        <div className="font-semibold">
          {queue.length} {queue.length === 1 ? "item" : "items"} · {minutes(plannedMinutes)} of{" "}
          {minutes(settings.minutes)}
          {clearedMinutes > 0 && ` · ${minutes(clearedMinutes)} cleared`}
        </div>
        <button
          type="button"
          className="border rounded px-2 py-1 text-sm"
          title="Rebuild the queue without what you've finished or skipped"
          onClick={load}
        >
          New queue
        </button>
      </div>

      {queue.length === 0 && (
        <p className="text-sm text-gray-500">
          {available === 0
            ? `Nothing waiting in your backlog for these services. Sync ${SPOTIFY.enabled ? "Watch Later or Spotify" : "Watch Later"} first.`
            : `Nothing fits in ${minutes(settings.minutes)}. Try more time or another service.`}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {queue.map((item) => {
          const status = statusOf(item);
          const finished = status === "completed" || status === "skipped";
          const badge = ["Started", "Shortlist", null][tier(item)];
          return (
            <li
              key={item.key}
              className={`flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded p-2 ${
                finished ? "opacity-50" : ""
              }`}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className={`${item.type === "video" ? "w-24 aspect-video" : "w-14 aspect-square"} object-cover rounded shrink-0`}
                />
              ) : (
                <div className="w-14 aspect-square rounded bg-gray-200 dark:bg-gray-800 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`font-semibold leading-tight line-clamp-2 hover:underline ${
                    status === "completed" ? "line-through" : ""
                  }`}
                >
                  {item.title}
                </a>
                <div className="flex items-center gap-1 text-sm text-gray-500 min-w-0">
                  <span className="shrink-0">{SOURCES.find((s) => s.type === item.type)?.icon}</span>
                  <span className="truncate">{item.subtitle}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {minutes(item.minutes)}
                  {item.type === "episode" && item.status === "in_progress" && " left"}
                  {badge && ` · ${badge}`}
                </div>
              </div>
              <ChipActions
                status={status}
                labels={QUEUE_ACTIONS}
                icons={QUEUE_ICONS}
                onChange={(next) => changeStatus(item, next)}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
