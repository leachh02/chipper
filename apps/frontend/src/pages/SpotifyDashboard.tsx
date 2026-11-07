import { useCallback, useEffect, useRef, useState } from "react";
import ConnectButton from "../components/spotify/ConnectButton";
import AlbumsView from "../components/spotify/AlbumsView";
import EpisodesView from "../components/spotify/EpisodesView";
import {
  handleSpotifyCallback,
  ensureValidToken,
  getAllSavedAlbums,
  getArtistGenres,
  getSavedEpisodes,
  loginWithSpotifyClick,
} from "../utils/spotify";
import {
  getAllAlbums,
  getAllEpisodes,
  getPreferences,
  importAlbums,
  importEpisodes,
  saveAlbumGenres,
  savePreferences,
  setAlbumFlags,
  setAlbumStatus,
  setEpisodeStatus,
} from "../db/queries";
import type {
  Album,
  ChipStatus,
  Episode,
  Preferences,
  SpotifyPreferences,
} from "../types";

type Tab = "albums" | "podcasts";

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

export default function SpotifyDashboard() {
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tab, setTab] = useState<Tab>("albums");
  const [status, setStatus] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // React runs effects twice in development; only sync once
  const started = useRef(false);

  const reload = useCallback(async () => {
    const [allAlbums, allEpisodes] = await Promise.all([
      getAllAlbums(),
      getAllEpisodes(),
    ]);
    setAlbums(allAlbums.filter((a) => !a.removedAt));
    setEpisodes(allEpisodes.filter((e) => !e.removedAt));
  }, []);

  const enrichGenres = useCallback(async () => {
    const pending = (await getAllAlbums()).filter(
      (a) => !a.removedAt && !a.genresCheckedAt,
    );
    const artistGenres = new Map<string, string[]>();

    for (const [index, album] of pending.entries()) {
      setStatus(`Looking up genres: ${index + 1} of ${pending.length} albums`);
      const genres = new Set<string>();
      for (const artistId of album.artist_id.split(", ").filter(Boolean)) {
        if (!artistGenres.has(artistId)) {
          artistGenres.set(artistId, await getArtistGenres(artistId));
        }
        artistGenres.get(artistId)!.forEach((g) => genres.add(g));
      }
      await saveAlbumGenres(new Map([[album.id, [...genres]]]));
    }

    if (pending.length) await reload();
  }, [reload]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setStatus("Syncing with Spotify…");
    setErrors([]);
    const messages: string[] = [];
    const failures: string[] = [];

    const [albumResult, episodeResult] = await Promise.allSettled([
      getAllSavedAlbums().then(importAlbums),
      getSavedEpisodes().then(importEpisodes),
    ]);

    if (albumResult.status === "fulfilled") {
      const { added, removed } = albumResult.value;
      if (added) messages.push(`${count(added, "new album")}`);
      if (removed) messages.push(`${count(removed, "album")} no longer saved`);
    } else {
      failures.push(`Couldn't refresh albums: ${String(albumResult.reason?.message ?? albumResult.reason)}`);
    }

    if (episodeResult.status === "fulfilled") {
      const { added, removed } = episodeResult.value;
      if (added) messages.push(`${count(added, "new episode")}`);
      if (removed) messages.push(`${count(removed, "episode")} no longer saved`);
    } else {
      failures.push(`Couldn't refresh podcasts: ${String(episodeResult.reason?.message ?? episodeResult.reason)}`);
    }

    await reload();
    setErrors(failures);

    if (albumResult.status === "fulfilled") {
      try {
        await enrichGenres();
      } catch (err) {
        failures.push(`Couldn't look up genres: ${String((err as Error).message ?? err)}`);
        setErrors([...failures]);
      }
    }

    if (messages.length) setStatus(`Synced: ${messages.join(", ")}.`);
    else setStatus(failures.length ? "" : "Synced: you're up to date.");
    setSyncing(false);
  }, [reload, enrichGenres]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function init() {
      setPreferences(await getPreferences());

      // Show what's saved straight away, then refresh from Spotify
      await reload();
      setLoading(false);

      try {
        await handleSpotifyCallback();
        await ensureValidToken();
      } catch (err) {
        setErrors([`Couldn't sign in to Spotify: ${String((err as Error).message ?? err)}`]);
      }

      if (!localStorage.getItem("access_token")) return;
      setIsAuthenticated(true);
      await sync();
    }

    init();
  }, [reload, sync]);

  function updatePreferences(changes: Partial<SpotifyPreferences>) {
    if (!preferences) return;
    const next = { ...preferences, spotify: { ...preferences.spotify, ...changes } };
    setPreferences(next);
    savePreferences(next);
  }

  async function updateAlbumStatus(id: string, status: ChipStatus) {
    const updated = await setAlbumStatus(id, status);
    if (updated) setAlbums((all) => all.map((a) => (a.id === id ? updated : a)));
  }

  async function updateAlbumFlags(id: string, flags: Pick<Album, "upNext" | "loved">) {
    const updated = await setAlbumFlags(id, flags);
    if (updated) setAlbums((all) => all.map((a) => (a.id === id ? updated : a)));
  }

  async function updateEpisodeStatus(id: string, status: ChipStatus) {
    const updated = await setEpisodeStatus(id, status);
    if (updated) setEpisodes((all) => all.map((e) => (e.id === id ? updated : e)));
  }

  if (loading || !preferences) return <div className="p-6">Loading...</div>;

  const hasData = albums.length > 0 || episodes.length > 0;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Chip List: Spotify Albums & Podcasts</h1>

      <div className="flex flex-wrap items-center gap-3 my-2">
        <div role="tablist" className="flex gap-1">
          {(["albums", "podcasts"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`px-3 py-1 rounded border ${
                tab === t ? "border-current font-semibold" : "border-transparent"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "albums" ? `Albums (${albums.length})` : `Podcasts (${episodes.length})`}
            </button>
          ))}
        </div>
        {isAuthenticated && (
          <>
            <button
              className="border p-2 rounded text-sm"
              disabled={syncing}
              onClick={sync}
            >
              Sync now
            </button>
            <button
              className="border p-2 rounded text-sm"
              title="Sign in again, for example after adding new permissions"
              onClick={loginWithSpotifyClick}
            >
              Reconnect Spotify
            </button>
          </>
        )}
        {status && (
          <span className="text-sm" role="status">
            {status}
          </span>
        )}
      </div>

      {errors.map((error) => (
        <p key={error} role="alert" className="text-sm text-red-600 my-1">
          {/[.!?]$/.test(error) ? error : `${error}.`}
          {hasData && " Showing your last saved copy."}
        </p>
      ))}

      {!isAuthenticated && <ConnectButton />}

      {tab === "albums" ? (
        <AlbumsView
          albums={albums}
          preferences={preferences.spotify}
          onPreferencesChange={updatePreferences}
          onStatusChange={updateAlbumStatus}
          onFlagsChange={updateAlbumFlags}
        />
      ) : (
        <EpisodesView episodes={episodes} onStatusChange={updateEpisodeStatus} />
      )}
    </div>
  );
}
