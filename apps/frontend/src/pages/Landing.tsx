import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  FaCheckCircle,
  FaHourglassHalf,
  FaPodcast,
  FaRecordVinyl,
  FaRegCircle,
  FaYoutube,
} from "react-icons/fa";
import { EXTENSION_NEEDS_ADDRESS, SPOTIFY } from "../config";
import { getAllAlbums, getAllEpisodes, getAllEvents, getAllVideos } from "../db/queries";
import type { ChipStatus } from "../types";
import { useRemoteChanges } from "../db/useRemoteChanges";
import { getFlag, setFlag } from "../utils/flags";
import { formatRuntime } from "../utils/format";
import { DEVICE_RUNS_EXTENSIONS, durationToSeconds, pingExtension } from "../utils/youtube";

const WAITING: ChipStatus[] = ["queued", "in_progress"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Totals = { count: number; ms: number };

type Summary = {
  videos: Totals;
  albums: Totals;
  episodes: Totals;
  clearedThisWeek: Totals;
  hasVideos: boolean;
  hasSpotify: boolean;
};

async function loadSummary(): Promise<Summary> {
  const [videos, albums, episodes, events] = await Promise.all([
    getAllVideos(),
    getAllAlbums(),
    getAllEpisodes(),
    getAllEvents(),
  ]);
  const live = <T extends { removedAt?: number }>(items: T[]) => items.filter((i) => !i.removedAt);
  const waiting = <T extends { status: ChipStatus }>(items: T[]) =>
    items.filter((i) => WAITING.includes(i.status));

  const videoMs = (id: string) => {
    const v = videos.find((x) => x.id === id);
    return v ? durationToSeconds(v.duration) * 1000 : 0;
  };
  const lengths: Record<string, (id: string) => number> = {
    video: videoMs,
    album: (id) => albums.find((a) => a.id === id)?.runtime_ms ?? 0,
    episode: (id) => episodes.find((e) => e.id === id)?.duration_ms ?? 0,
  };

  // Each item finished in the last week, counted once
  const since = Date.now() - WEEK_MS;
  const cleared = new Map<string, number>();
  for (const e of events) {
    if (e.status === "completed" && e.timestamp >= since) {
      cleared.set(`${e.itemType}:${e.itemId}`, lengths[e.itemType](e.itemId));
    }
  }

  const liveVideos = waiting(live(videos));
  const liveAlbums = waiting(live(albums));
  const liveEpisodes = waiting(live(episodes));
  return {
    videos: {
      count: liveVideos.length,
      ms: liveVideos.reduce((sum, v) => sum + durationToSeconds(v.duration) * 1000, 0),
    },
    albums: { count: liveAlbums.length, ms: liveAlbums.reduce((sum, a) => sum + a.runtime_ms, 0) },
    episodes: {
      count: liveEpisodes.length,
      ms: liveEpisodes.reduce(
        (sum, e) => sum + Math.max(0, e.duration_ms - e.resume_position_ms),
        0,
      ),
    },
    clearedThisWeek: {
      count: cleared.size,
      ms: [...cleared.values()].reduce((a, b) => a + b, 0),
    },
    hasVideos: videos.length > 0,
    hasSpotify: albums.length > 0 || episodes.length > 0,
  };
}

export default function Landing() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [extension, setExtension] = useState<boolean | null>(null);
  const [guideHidden, setGuideHidden] = useState(() => getFlag("guideHidden"));

  const reload = useCallback(() => {
    loadSummary().then(setSummary);
  }, []);

  useEffect(() => {
    reload();
    pingExtension().then(setExtension);
  }, [reload]);
  useRemoteChanges(reload);

  if (!summary) return <div className="page">Loading...</div>;

  const steps: { done: boolean; title: string; body: ReactNode; optional?: boolean }[] = [
    {
      done: !!extension || summary.hasVideos,
      title: "Install the extension",
      body: (
        <>
          {!DEVICE_RUNS_EXTENSIONS && "Install it on a computer, since phones can't run extensions. "}
          It reads your Watch Later playlist, since YouTube's API doesn't offer it. Open{" "}
          <code className="rounded bg-surface-2 px-1">chrome://extensions</code>, turn on Developer
          mode, choose <strong>Load unpacked</strong> and pick the{" "}
          <code className="rounded bg-surface-2 px-1">apps/extension</code> folder
          {EXTENSION_NEEDS_ADDRESS && (
            <>
              . Then click its toolbar button and add{" "}
              <code className="rounded bg-surface-2 px-1">{window.location.host}</code>
            </>
          )}
          , then refresh this page.
        </>
      ),
    },
    {
      done: summary.hasVideos,
      title: "Sync Watch Later",
      body: (
        <>
          {DEVICE_RUNS_EXTENSIONS ? "On" : "On a computer, go to"}{" "}
          <Link to="/dashboard/youtube" className="link">
            Watch Later
          </Link>
          {DEVICE_RUNS_EXTENSIONS ? ", use" : " and use"} <strong>Full sync</strong>. A tab opens on YouTube for a moment while Chipper reads
          the playlist.
        </>
      ),
    },
    ...(SPOTIFY.enabled
      ? [
          {
            done: summary.hasSpotify,
            optional: true,
            title: "Connect Spotify",
            body: (
              <>
                Bring in your saved albums and podcast episodes from{" "}
                <Link to="/dashboard/spotify" className="link">
                  Spotify
                </Link>
                .
              </>
            ),
          },
        ]
      : []),
    {
      done: getFlag("sessionTried"),
      title: "Try a chip session",
      body: (
        <>
          Say how long you've got, and Chipper picks what fits: things you've started, then your
          shortlist, then the shortest.
        </>
      ),
    },
  ];
  const setUp = steps.every((s) => s.done || s.optional);
  const showGuide = !setUp && !guideHidden;

  const totalMs = summary.videos.ms + summary.albums.ms + summary.episodes.ms;

  return (
    <div className="page max-w-4xl">
      <section className="py-4 sm:py-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {setUp ? "Ready for a chip session?" : "Chip away at your backlog"}
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          {setUp
            ? `You've got ${formatRuntime(totalMs)} waiting. Pick how long you have and clear what fits.`
            : `Chipper brings your YouTube Watch Later${SPOTIFY.enabled ? ", saved albums and podcasts" : ""} into one list, then helps you work through it a bit at a time.`}
        </p>
        <Link to="/queue" className="btn btn-primary btn-lg mt-5">
          <FaHourglassHalf />
          Start a chip session
        </Link>
        {!setUp && guideHidden && (
          <button
            type="button"
            className="mt-3 block text-sm text-muted hover:text-fg"
            onClick={() => {
              setFlag("guideHidden", false);
              setGuideHidden(false);
            }}
          >
            Show the setup steps
          </button>
        )}
      </section>

      {showGuide && (
        <section className="card p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Get started</h2>
            <button
              type="button"
              className="text-sm text-muted hover:text-fg"
              onClick={() => {
                setFlag("guideHidden");
                setGuideHidden(true);
              }}
            >
              Hide
            </button>
          </div>
          <ol className="mt-3 flex flex-col gap-4">
            {steps.map((step) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className={`mt-0.5 shrink-0 text-lg ${step.done ? "text-accent" : "text-muted"}`}
                >
                  {step.done ? <FaCheckCircle aria-label="Done" /> : <FaRegCircle aria-label="To do" />}
                </span>
                <div className={step.done ? "text-muted" : ""}>
                  <div className="font-medium">
                    <span className={step.done ? "line-through" : ""}>{step.title}</span>
                    {step.optional && <span className="ml-2 text-xs text-muted">optional</span>}
                  </div>
                  {!step.done && <p className="mt-0.5 text-sm text-muted">{step.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6">
        <h2 className="section-title">Your backlog</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            to="/dashboard/youtube"
            icon={<FaYoutube />}
            label="Watch Later"
            totals={summary.videos}
            noun="video"
          />
          {SPOTIFY.enabled && (
            <>
              <Stat
                to="/dashboard/spotify"
                icon={<FaRecordVinyl />}
                label="Albums"
                totals={summary.albums}
                noun="album"
              />
              <Stat
                to="/dashboard/spotify"
                icon={<FaPodcast />}
                label="Podcasts"
                totals={summary.episodes}
                noun="episode"
              />
            </>
          )}
          <div className="card p-4">
            <div className="text-sm text-muted">Cleared this week</div>
            <div className="mt-1 text-2xl font-semibold text-accent">
              {formatRuntime(summary.clearedThisWeek.ms)}
            </div>
            <div className="text-sm text-muted">
              {summary.clearedThisWeek.count}{" "}
              {summary.clearedThisWeek.count === 1 ? "item" : "items"}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  to,
  icon,
  label,
  totals,
  noun,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  totals: Totals;
  noun: string;
}) {
  return (
    <Link to={to} className="card p-4 transition-colors hover:bg-surface-2">
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{formatRuntime(totals.ms)}</div>
      <div className="text-sm text-muted">
        {totals.count.toLocaleString()} {noun}
        {totals.count === 1 ? "" : "s"} to go
      </div>
    </Link>
  );
}
