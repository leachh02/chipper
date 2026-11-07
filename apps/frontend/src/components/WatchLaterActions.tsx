import { useState } from "react";
import type { RawVideo, Video } from "../types";
import {
  importRawVideos,
  markRemovedFromWatchLater,
  updateMeta,
} from "../db/queries";
import {
  fetchVideoDetails,
  parseVideoIdsFromCsv,
  removeFromWatchLater,
  syncWatchLater,
  type SyncMode,
} from "../utils/youtube";

type Props = {
  videos: Video[];
  onChange: () => void;
};

// oEmbed requests to run at once during a CSV import
const CSV_CONCURRENCY = 4;

// countVideos(1) -> "1 video", countVideos(2, "new") -> "2 new videos"
function countVideos(count: number, adjective?: string) {
  const noun = count === 1 ? "video" : "videos";
  return [count, adjective, noun].filter(Boolean).join(" ");
}

export default function WatchLaterActions({ videos, onChange }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const inWatchLater = videos.filter((v) => !v.removedAt);
  const chipList = inWatchLater.filter(
    (v) => v.status === "completed" || v.status === "skipped",
  );

  async function run(label: string, task: () => Promise<string>) {
    setBusy(label);
    setMessage("");
    try {
      setMessage(await task());
      onChange();
    } catch (err) {
      setMessage(`Something went wrong: ${String(err)}`);
    } finally {
      setBusy(null);
    }
  }

  function sync(mode: SyncMode) {
    run(mode === "quick" ? "Quick syncing…" : "Syncing…", async () => {
      const result = await syncWatchLater(
        mode,
        inWatchLater.map((v) => v.id),
      );
      if (!result.ok) return `Sync failed: ${result.error}`;

      const summary = await importRawVideos(result.videos, {
        complete: result.complete,
      });
      await updateMeta(Date.now());

      const parts = [];
      if (summary.added) parts.push(countVideos(summary.added, "new"));
      if (summary.removed) {
        parts.push(`${countVideos(summary.removed)} no longer in Watch Later`);
      }
      return parts.length
        ? `Synced: ${parts.join(", ")}.`
        : "Synced: you're up to date.";
    });
  }

  function clearChipList() {
    const confirmed = window.confirm(
      `Remove ${countVideos(chipList.length)} you've watched or skipped from your YouTube Watch Later? Chipper keeps its own record of them.`,
    );
    if (!confirmed) return;

    run("Removing from YouTube…", async () => {
      const result = await removeFromWatchLater(chipList.map((v) => v.id));
      if (!result.ok) return `Removal failed: ${result.error}`;

      // Videos that weren't found have already left Watch Later
      await markRemovedFromWatchLater([...result.removed, ...result.notFound]);

      const removedCount = result.removed.length + result.notFound.length;
      const failedCount = result.failed.length;
      const failed = failedCount
        ? ` ${countVideos(failedCount)} couldn't be removed and ${failedCount === 1 ? "is" : "are"} still there; try again.`
        : "";
      return `Removed ${countVideos(removedCount)} from Watch Later.${failed}`;
    });
  }

  function importCsv(file: File) {
    run("Importing…", async () => {
      const known = new Set(videos.map((v) => v.id));
      const ids = parseVideoIdsFromCsv(await file.text());
      const newIds = ids.filter((id) => !known.has(id));

      const details: RawVideo[] = [];
      for (let i = 0; i < newIds.length; i += CSV_CONCURRENCY) {
        setBusy(`Importing ${i} of ${newIds.length}…`);
        const batch = newIds.slice(i, i + CSV_CONCURRENCY);
        details.push(...(await Promise.all(batch.map(fetchVideoDetails))));
      }

      const summary = await importRawVideos(details, { complete: false });
      return `Imported ${countVideos(summary.added)} (${ids.length - newIds.length} already in Chipper). Durations fill in on your next sync.`;
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 my-2">
      <button
        className="border p-2 rounded"
        disabled={!!busy}
        onClick={() => sync("quick")}
        title="Stops once it reaches videos Chipper already has. Assumes new videos are at the top of Watch Later."
      >
        Quick sync
      </button>
      <button
        className="border p-2 rounded"
        disabled={!!busy}
        onClick={() => sync("full")}
        title="Reads the whole Watch Later playlist and notices videos you've removed on YouTube."
      >
        Full sync
      </button>
      <button
        className="border p-2 rounded"
        disabled={!!busy || chipList.length === 0}
        onClick={clearChipList}
      >
        Remove {countVideos(chipList.length, "chipped")} from YouTube
      </button>
      <label className="border p-2 rounded cursor-pointer focus-within:outline">
        Import CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importCsv(file);
            e.target.value = "";
          }}
        />
      </label>
      {(busy || message) && (
        <span className="text-sm" role="status">
          {busy ?? message}
        </span>
      )}
    </div>
  );
}
