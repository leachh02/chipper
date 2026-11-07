import { useState } from "react";
import { FaCheck, FaForward, FaHeadphones } from "react-icons/fa";
import type { ChipStatus, Episode } from "../../types";
import ChipActions from "../ChipActions";
import { formatRuntime } from "../../utils/format";

const EPISODE_ACTIONS: Partial<Record<ChipStatus, string>> = {
  in_progress: "Listening",
  completed: "Listened",
  skipped: "Skip",
};

const EPISODE_ICONS = {
  in_progress: <FaHeadphones />,
  completed: <FaCheck />,
  skipped: <FaForward />,
};

type Props = {
  episodes: Episode[];
  onStatusChange: (id: string, status: ChipStatus) => void;
};

export default function EpisodesView({ episodes, onStatusChange }: Props) {
  const [showDone, setShowDone] = useState(false);
  const [sortBy, setSortBy] = useState<"added" | "release" | "duration">("added");

  const shown = episodes
    .filter(
      (e) => showDone || (e.status !== "completed" && e.status !== "skipped"),
    )
    .sort((a, b) => {
      if (sortBy === "duration") return a.duration_ms - b.duration_ms;
      if (sortBy === "release") return b.release_date.localeCompare(a.release_date);
      return b.added_at.localeCompare(a.added_at);
    });

  const remainingMs = shown.reduce(
    (sum, e) => sum + Math.max(0, e.duration_ms - e.resume_position_ms),
    0,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 my-2 text-sm">
        <select
          className="border p-2"
          aria-label="Sort episodes by"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="added">Recently saved</option>
          <option value="release">Newest release</option>
          <option value="duration">Shortest first</option>
        </select>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={showDone}
            onChange={() => setShowDone(!showDone)}
          />
          Show listened and skipped
        </label>
      </div>

      <div className="font-semibold my-2">
        {shown.length} {shown.length === 1 ? "episode" : "episodes"} ·{" "}
        {formatRuntime(remainingMs)} left
      </div>

      {episodes.length === 0 && (
        <p className="text-sm text-gray-500">
          No saved episodes. Save episodes in Spotify ("Your Episodes") and
          they'll show up here.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {shown.map((episode) => {
          const progress = episode.duration_ms
            ? Math.min(1, episode.resume_position_ms / episode.duration_ms)
            : 0;
          return (
            <li
              key={episode.id}
              className="flex items-center gap-3 border border-gray-300 dark:border-gray-700 rounded p-2"
            >
              {episode.image && (
                <img
                  src={episode.image}
                  alt=""
                  loading="lazy"
                  className="w-16 h-16 object-cover rounded shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={episode.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold leading-tight line-clamp-2 hover:underline"
                >
                  {episode.name}
                </a>
                <div className="text-sm text-gray-500 truncate">{episode.show}</div>
                <div className="text-xs text-gray-500">
                  {episode.release_date} · {formatRuntime(episode.duration_ms)}
                  {progress > 0 && progress < 1 &&
                    ` · ${formatRuntime(episode.duration_ms - episode.resume_position_ms)} left`}
                </div>
                {progress > 0 && (
                  <div className="h-1 mt-1 rounded bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-1 rounded bg-current"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                )}
              </div>
              <ChipActions
                status={episode.status}
                labels={EPISODE_ACTIONS}
                icons={EPISODE_ICONS}
                onChange={(status) => onStatusChange(episode.id, status)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
