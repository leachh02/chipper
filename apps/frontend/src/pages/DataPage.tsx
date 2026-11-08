import { useCallback, useEffect, useState } from "react";
import ServerAccount from "../components/ServerAccount";
import { SERVER } from "../config";
import {
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
  type BackupCounts,
} from "../db/backup";
import { getAllAlbums, getAllEpisodes, getAllVideos } from "../db/queries";
import { useRemoteChanges } from "../db/useRemoteChanges";
import { useSync } from "../sync/context";

function describeCounts(counts: BackupCounts) {
  const parts = [
    [counts.videos, "video"],
    [counts.albums, "album"],
    [counts.episodes, "episode"],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .map(([n, noun]) => `${n} ${noun}${n === 1 ? "" : "s"}`)
    .join(", ");
}

export default function DataPage() {
  const [counts, setCounts] = useState<BackupCounts | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [persisted, setPersisted] = useState<boolean | null>(null);

  const { session } = useSync();

  const loadCounts = useCallback(async () => {
    const [videos, albums, episodes] = await Promise.all([
      getAllVideos(),
      getAllAlbums(),
      getAllEpisodes(),
    ]);
    setCounts({
      videos: videos.filter((v) => !v.removedAt).length,
      albums: albums.filter((a) => !a.removedAt).length,
      episodes: episodes.filter((e) => !e.removedAt).length,
    });
  }, []);

  useEffect(() => {
    loadCounts();
    navigator.storage?.persisted?.().then(setPersisted);
  }, [loadCounts]);
  useRemoteChanges(loadCounts);

  async function exportData() {
    const backup = await createBackup();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
    setError("");
    setStatus(`Saved ${link.download}.`);
  }

  async function importData(file: File) {
    setStatus("");
    setError("");
    try {
      const backup = parseBackup(await file.text());
      if (
        mode === "replace" &&
        !window.confirm(
          "Replace everything Chipper has on this device with the backup? Anything not in the backup will be lost.",
        )
      ) {
        return;
      }
      const { added, updated } = await restoreBackup(backup, mode);
      await loadCounts();
      const parts = [
        describeCounts(added) && `added ${describeCounts(added)}`,
        describeCounts(updated) && `updated ${describeCounts(updated)}`,
      ].filter(Boolean);
      const summary = parts.length ? parts.join(" and ") : "nothing needed changing";
      setStatus(
        mode === "replace"
          ? "Replaced this device's data with the backup."
          : `Merged the backup: ${summary}.`,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function keepData() {
    setPersisted((await navigator.storage?.persist?.()) ?? false);
  }

  return (
    <div className="page max-w-2xl">
      <h1 className="page-title">Your data</h1>

      <p className="my-2">
        Chipper keeps everything in this browser, on this device
        {counts && describeCounts(counts) ? `: ${describeCounts(counts)}` : ""}.{" "}
        {session
          ? "It's also synced to your Chipper server, but a backup now and then doesn't hurt."
          : "Nothing is stored online, so save a backup now and then. A backup also moves your choices between devices, such as from your phone to the PC that syncs Watch Later."}
      </p>

      {SERVER.enabled && <ServerAccount />}

      <section className="my-6">
        <h2 className="section-title">Save a backup</h2>
        <button type="button" className="btn" onClick={exportData}>
          Download backup
        </button>
        <p className="text-sm text-muted mt-1">
          Includes your videos, albums, podcasts, history and settings, but not your Spotify
          sign-in.
        </p>
      </section>

      <section className="my-6">
        <h2 className="section-title">Load a backup</h2>
        <fieldset className="flex flex-col gap-1 mb-2 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="mode"
              className="mt-1"
              checked={mode === "merge"}
              onChange={() => setMode("merge")}
            />
            <span>
              <strong>Merge</strong>: keep everything on both, using the newest choice for each
              item. Use this to bring another device's changes in.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="mode"
              className="mt-1"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
            />
            <span>
              <strong>Replace</strong>: make this device an exact copy of the backup.
            </span>
          </label>
        </fieldset>
        <label className="btn">
          Choose backup file
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) importData(file);
            }}
          />
        </label>
      </section>

      {status && (
        <p role="status" className="text-sm my-2">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger my-2">
          {error}
        </p>
      )}

      {persisted === false && (
        <section className="my-6">
          <h2 className="section-title">Keep your data</h2>
          <p className="text-sm mb-2">
            Browsers can clear a site's data when space runs low. You can ask yours to keep
            Chipper's.
          </p>
          <button type="button" className="btn" onClick={keepData}>
            Ask the browser to keep it
          </button>
        </section>
      )}
      {persisted && (
        <p className="text-sm text-muted my-6">
          Your browser has agreed to keep Chipper's data.
        </p>
      )}
    </div>
  );
}
