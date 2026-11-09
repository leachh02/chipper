import { FaCheck, FaForward, FaHeadphones } from "react-icons/fa";
import type { ChipStatus, Episode, PodcastPreferences } from "../../types";
import ChipActions from "../ChipActions";
import DurationRange from "../DurationRange";
import { formatRuntime, inDurationRange } from "../../utils/format";
import TopicControls from "../../topics/TopicControls";
import TopicSections from "../../topics/TopicSections";
import { useTopics } from "../../topics/useTopics";

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

const STATUS_FILTERS: { label: string; status: ChipStatus }[] = [
  { label: "Not started", status: "queued" },
  { label: "Part listened", status: "in_progress" },
  { label: "Listened", status: "completed" },
  { label: "Skipped", status: "skipped" },
];

const MAX_EPISODE_MINUTES = 240;

function timeLeftMs(episode: Episode) {
  return Math.max(0, episode.duration_ms - episode.resume_position_ms);
}

type Props = {
  episodes: Episode[];
  preferences: PodcastPreferences;
  onPreferencesChange: (changes: Partial<PodcastPreferences>) => void;
  onStatusChange: (id: string, status: ChipStatus) => void;
};

export default function EpisodesView({
  episodes,
  preferences,
  onPreferencesChange,
  onStatusChange,
}: Props) {
  const { sortBy, statusFilter, durationRange, groupByTopic } = preferences;
  const topics = useTopics("episode");

  const shown = episodes
    .filter(
      (e) =>
        statusFilter.includes(e.status) &&
        inDurationRange(timeLeftMs(e) / 60000, durationRange, MAX_EPISODE_MINUTES),
    )
    .sort((a, b) => {
      if (sortBy === "duration") return timeLeftMs(a) - timeLeftMs(b);
      if (sortBy === "release") return b.release_date.localeCompare(a.release_date);
      return b.added_at.localeCompare(a.added_at);
    });

  const remainingMs = shown.reduce((sum, e) => sum + timeLeftMs(e), 0);

  return (
    <div>
      <div className="card my-4 flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <select
          className="input"
          aria-label="Sort episodes by"
          value={sortBy}
          onChange={(e) =>
            onPreferencesChange({ sortBy: e.target.value as typeof sortBy })
          }
        >
          <option value="added">Recently saved</option>
          <option value="release">Newest release</option>
          <option value="duration">Least time left</option>
        </select>
        {STATUS_FILTERS.map(({ label, status }) => (
          <label key={status} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={statusFilter.includes(status)}
              onChange={() =>
                onPreferencesChange({
                  statusFilter: statusFilter.includes(status)
                    ? statusFilter.filter((s) => s !== status)
                    : [...statusFilter, status],
                })
              }
            />
            {label}
          </label>
        ))}
      </div>

      <DurationRange
        label="Time left"
        value={durationRange}
        max={MAX_EPISODE_MINUTES}
        onChange={(range) => onPreferencesChange({ durationRange: range })}
      />

      <TopicControls
        state={topics}
        grouped={!!groupByTopic}
        onGroupedChange={(grouped) => onPreferencesChange({ groupByTopic: grouped })}
      />
      </div>

      <p className="mb-3 text-sm text-muted">
        {shown.length} {shown.length === 1 ? "episode" : "episodes"} ·{" "}
        {formatRuntime(remainingMs)} left
      </p>

      {episodes.length === 0 && (
        <p className="card p-6 text-center text-sm text-muted">
          No saved episodes. Save episodes in Spotify ("Your Episodes") and
          they'll show up here.
        </p>
      )}

      {groupByTopic && topics.topics ? (
        <TopicSections items={shown} topics={topics.topics} runtimeMs={timeLeftMs}>
          {(episodes) => <EpisodeList episodes={episodes} onStatusChange={onStatusChange} />}
        </TopicSections>
      ) : (
        <EpisodeList episodes={shown} onStatusChange={onStatusChange} />
      )}
    </div>
  );
}

function EpisodeList({
  episodes,
  onStatusChange,
}: {
  episodes: Episode[];
  onStatusChange: (id: string, status: ChipStatus) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {episodes.map((episode) => {
        const progress = episode.duration_ms
          ? Math.min(1, episode.resume_position_ms / episode.duration_ms)
          : 0;
        return (
          <li
            key={episode.id}
            className="card flex items-center gap-3 p-2 pr-3"
          >
            {episode.image && (
              <img
                src={episode.image}
                alt=""
                loading="lazy"
                className="w-16 h-16 object-cover rounded-lg shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <a
                href={episode.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium leading-snug line-clamp-2 hover:underline"
              >
                {episode.name}
              </a>
              <div className="text-sm text-muted truncate">{episode.show}</div>
              <div className="text-xs text-muted">
                {episode.release_date} · {formatRuntime(episode.duration_ms)}
                {progress > 0 && progress < 1 &&
                  ` · ${formatRuntime(episode.duration_ms - episode.resume_position_ms)} left`}
              </div>
              {progress > 0 && (
                <div className="h-1 mt-1.5 rounded-full bg-surface-2">
                  <div
                    className="h-1 rounded-full bg-accent"
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
  );
}
