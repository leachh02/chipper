import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FaCheck, FaForward, FaPodcast, FaRecordVinyl, FaYoutube } from "react-icons/fa";
import ChipActions from "../components/ChipActions";
import { SPOTIFY } from "../config";
import {
  getAllAlbums,
  getAllEpisodes,
  getAllVideos,
  getPreferences,
  getTopics,
  savePreferences,
  setAlbumStatus,
  setEpisodeStatus,
  setVideoStatus,
} from "../db/queries";
import type { ChipStatus, ItemType, Preferences, QueuePreferences, Topics } from "../types";
import { formatRuntime } from "../utils/format";
import { setFlag } from "../utils/flags";
import {
  albumItems,
  buildQueue,
  episodeItems,
  inTopics,
  tier,
  topicKey,
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
  // Groups by topic from a Chipper server, when there are any
  const [topics, setTopics] = useState<Topics[]>([]);

  async function load() {
    const [videos, albums, episodes, prefs, videoTopics, episodeTopics] = await Promise.all([
      getAllVideos(),
      getAllAlbums(),
      getAllEpisodes(),
      getPreferences(),
      getTopics("video"),
      getTopics("episode"),
    ]);
    setPool([...videoItems(videos), ...albumItems(albums), ...episodeItems(episodes)]);
    setTopics([videoTopics, episodeTopics].filter((t): t is Topics => !!t));
    setMarked({});
    setPreferences(prefs);
  }

  useEffect(() => {
    load();
    // Ticks off the last step of the setup guide on the home page
    setFlag("sessionTried");
  }, []);

  const settings = useMemo(
    () =>
      preferences && {
        ...preferences.queue,
        // Albums and podcasts only exist where Spotify is set up
        sources: preferences.queue.sources.filter((s) => SOURCES.some((x) => x.type === s)),
        topics: preferences.queue.topics ?? [],
      },
    [preferences],
  );
  // Everything the session can pick from, with these services and topics
  const candidates = useMemo(
    () =>
      settings
        ? inTopics(
            pool.filter((item) => settings.sources.includes(item.type)),
            topics,
            settings.topics,
          )
        : [],
    [pool, settings, topics],
  );
  const queue = useMemo(
    () => (settings ? buildQueue(candidates, settings.minutes) : []),
    [candidates, settings],
  );

  if (!preferences || !settings) return <div className="page">Loading...</div>;

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
  const available = candidates.length;
  // Topics of the services in this session
  const topicChoices = topics.filter((t) => settings.sources.includes(t.itemType));

  function toggleTopic(key: string) {
    update({
      topics: settings!.topics.includes(key)
        ? settings!.topics.filter((k) => k !== key)
        : [...settings!.topics, key],
    });
  }

  const progress = plannedMinutes ? clearedMinutes / plannedMinutes : 0;

  return (
    <div className="page max-w-3xl">
      <h1 className="page-title">Chip session</h1>

      <section className="card mt-4 p-4 sm:p-5">
        <h2 className="section-title">How long have you got?</h2>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={settings.minutes === m}
              className={`btn min-w-14 ${settings.minutes === m ? "btn-primary" : ""}`}
              onClick={() => update({ minutes: m })}
            >
              {minutes(m)}
            </button>
          ))}
          <label className="flex items-center gap-2 text-sm text-muted">
            or
            <input
              type="number"
              min={1}
              max={1440}
              aria-label="Minutes"
              className="input w-20"
              value={settings.minutes}
              onChange={(e) => {
                const value = Math.round(Number(e.target.value));
                if (value > 0) update({ minutes: Math.min(value, 1440) });
              }}
            />
            min
          </label>
        </div>

        {SOURCES.length > 1 && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {SOURCES.map(({ type, label, icon }) => (
              <label key={type} className="flex items-center gap-2">
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
                <span className="text-muted">{icon}</span>
                {label}
              </label>
            ))}
          </div>
        )}

        {topicChoices.length > 0 && (
          <div className="mt-4">
            <h2 className="section-title">Stick to topics</h2>
            {topicChoices.map(({ itemType, groups }) => (
              <div key={itemType} className="mb-2 flex flex-wrap items-center gap-1.5">
                {topicChoices.length > 1 && (
                  <span className="mr-1 text-muted" title={ALL_SOURCES.find((s) => s.type === itemType)?.label}>
                    {ALL_SOURCES.find((s) => s.type === itemType)?.icon}
                  </span>
                )}
                {groups.map(({ label }) => {
                  const key = topicKey(itemType, label);
                  const on = settings.topics.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      className={`btn px-2.5 py-1 text-xs ${on ? "btn-primary" : ""}`}
                      onClick={() => toggleTopic(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ))}
            <p className="text-xs text-muted">
              Pick none to include everything.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">
            {queue.length} {queue.length === 1 ? "item" : "items"} · {minutes(plannedMinutes)}
            <span className="font-normal text-muted"> of {minutes(settings.minutes)}</span>
          </div>
          {clearedMinutes > 0 && (
            <div className="text-sm text-accent">{minutes(clearedMinutes)} cleared</div>
          )}
        </div>
        <button
          type="button"
          className="btn"
          title="Rebuild the queue without what you've finished or skipped"
          onClick={load}
        >
          New queue
        </button>
      </div>

      {queue.length > 0 && (
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {queue.length === 0 && (
        <p className="card p-6 text-center text-sm text-muted">
          {available === 0 && settings.topics.length > 0
            ? "Nothing waiting in these topics. Pick others, or none."
            : available === 0
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
              className={`card flex items-center gap-3 p-2 pr-3 transition-opacity ${
                finished ? "opacity-50" : ""
              }`}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className={`${item.type === "video" ? "w-24 aspect-video" : "w-14 aspect-square"} object-cover rounded-lg shrink-0`}
                />
              ) : (
                <div className="w-14 aspect-square rounded-lg bg-surface-2 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`font-medium leading-snug line-clamp-2 hover:underline ${
                    status === "completed" ? "line-through" : ""
                  }`}
                >
                  {item.title}
                </a>
                <div className="flex items-center gap-1.5 text-sm text-muted min-w-0">
                  <span className="shrink-0">{ALL_SOURCES.find((s) => s.type === item.type)?.icon}</span>
                  <span className="truncate">{item.subtitle}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {minutes(item.minutes)}
                  {item.type === "episode" && item.status === "in_progress" && " left"}
                  {badge && (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-medium text-fg">
                      {badge}
                    </span>
                  )}
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
