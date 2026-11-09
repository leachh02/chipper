import { useState } from "react";
import type { TopicsState } from "./useTopics";

const GROUP_COUNTS = [3, 4, 5, 6, 8, 10, 12];

type Props = {
  state: TopicsState;
  grouped: boolean;
  onGroupedChange: (grouped: boolean) => void;
};

// "Group by topic", with the number of groups and a button to regroup, for
// a self-hosted server with the clustering service. Hidden everywhere else.
export default function TopicControls({ state, grouped, onGroupedChange }: Props) {
  const { topics, canRegroup, busy, error, regroup } = state;
  // null lets the server choose; until picked, whatever was asked for last
  const [picked, setPicked] = useState<number | null | undefined>();
  const count = picked === undefined ? (topics?.requested ?? null) : picked;

  if (!canRegroup && !topics) return null;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={grouped && !!topics}
            disabled={!topics}
            onChange={() => onGroupedChange(!grouped)}
          />
          Group by topic
        </label>
        {canRegroup && (
          <div className="flex items-center gap-2">
            <select
              className="input"
              aria-label="Number of groups"
              value={count ?? ""}
              onChange={(e) => setPicked(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any number of groups</option>
              {GROUP_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n} groups
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={async () => {
                await regroup(count);
                onGroupedChange(true);
              }}
            >
              {busy ? "Grouping..." : topics ? "Regroup" : "Group"}
            </button>
          </div>
        )}
        {topics && (
          <span className="text-muted">
            Grouped{" "}
            {new Date(topics.createdAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
