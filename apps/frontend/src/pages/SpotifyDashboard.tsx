import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SPOTIFY } from "../config";
import ConnectButton from "../components/spotify/ConnectButton";
import AlbumsView from "../components/spotify/AlbumsView";
import EpisodesView from "../components/spotify/EpisodesView";
import {
  handleSpotifyCallback,
  ensureValidToken,
  getAllSavedAlbums,
  getSavedEpisodes,
  loginWithSpotifyClick,
} from "../utils/spotify";
import { DISCOGS_DUMPS_URL, matchDiscogsGenres } from "../utils/discogs";
import {
  getAllAlbums,
  getAllEpisodes,
  getPreferences,
  importAlbums,
  importEpisodes,
  saveAlbumGenres,
  savePreferences,
  setAlbumFlags,
  setAlbumGenres,
  setAlbumStatus,
  setEpisodeStatus,
} from "../db/queries";
import type {
  Album,
  ChipStatus,
  Episode,
  PodcastPreferences,
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

  async function importGenres(file: File) {
    setSyncing(true);
    setErrors([]);
    try {
      const { genresById, checked, matched } = await matchDiscogsGenres(
        file,
        albums,
        (fraction) =>
          setStatus(`Reading Discogs data: ${Math.round(fraction * 100)}%`),
      );
      const kept = await saveAlbumGenres(genresById);
      await reload();
      setStatus(
        `Found genres for ${matched} of ${count(checked, "album")} on Discogs.` +
          (kept ? ` Kept your own genres on ${count(kept, "album")}.` : ""),
      );
    } catch (err) {
      setStatus("");
      setErrors([`Couldn't import genres: ${String((err as Error).message ?? err)}`]);
    }
    setSyncing(false);
  }

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

    if (messages.length) setStatus(`Synced: ${messages.join(", ")}.`);
    else setStatus(failures.length ? "" : "Synced: you're up to date.");
    setSyncing(false);
  }, [reload]);

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

  function updatePodcastPreferences(changes: Partial<PodcastPreferences>) {
    if (!preferences) return;
    const next = { ...preferences, podcasts: { ...preferences.podcasts, ...changes } };
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

  async function updateAlbumGenres(id: string, genres: string[]) {
    const updated = await setAlbumGenres(id, genres);
    if (updated) setAlbums((all) => all.map((a) => (a.id === id ? updated : a)));
  }

  async function updateEpisodeStatus(id: string, status: ChipStatus) {
    const updated = await setEpisodeStatus(id, status);
    if (updated) setEpisodes((all) => all.map((e) => (e.id === id ? updated : e)));
  }

  if (!SPOTIFY.enabled) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-xl font-bold">Spotify isn't set up here</h1>
        <p className="my-2">
          Spotify limits each app to 5 users, so this copy of Chipper doesn't include it. To
          chip away at your albums and podcasts, run your own copy with your own Spotify client
          ID. The README on{" "}
          <a href="https://github.com/leachh02/chipper" className="underline">
            GitHub
          </a>{" "}
          explains how.
        </p>
        <Link to="/" className="underline">
          Back home
        </Link>
      </div>
    );
  }

  if (loading || !preferences) return <div className="p-6">Loading...</div>;

  const hasData = albums.length > 0 || episodes.length > 0;
  const uncheckedAlbums = albums.filter((a) => !a.genresCheckedAt).length;

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
        {tab === "albums" && albums.length > 0 && (
          <label
            className={`border p-2 rounded text-sm cursor-pointer ${syncing ? "opacity-50 pointer-events-none" : ""}`}
            title="Match your albums against a Discogs masters data dump (discogs_…_masters.xml.gz)"
          >
            Import genres from Discogs
            <input
              type="file"
              accept=".gz,.xml"
              className="sr-only"
              disabled={syncing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) importGenres(file);
              }}
            />
          </label>
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
          {hasData && error.startsWith("Couldn't refresh") && " Showing your last saved copy."}
        </p>
      ))}

      {!isAuthenticated && <ConnectButton />}

      {tab === "albums" && uncheckedAlbums > 0 && (
        <p className="text-sm text-gray-500 my-1">
          {count(uncheckedAlbums, "album")} {uncheckedAlbums === 1 ? "has" : "have"} no
          genres yet. Download the latest masters file from{" "}
          <a href={DISCOGS_DUMPS_URL} target="_blank" rel="noreferrer" className="underline">
            Discogs data dumps
          </a>{" "}
          and use Import genres from Discogs.
        </p>
      )}

      {tab === "albums" ? (
        <AlbumsView
          albums={albums}
          preferences={preferences.spotify}
          onPreferencesChange={updatePreferences}
          onStatusChange={updateAlbumStatus}
          onFlagsChange={updateAlbumFlags}
          onGenresChange={updateAlbumGenres}
        />
      ) : (
        <EpisodesView
          episodes={episodes}
          preferences={preferences.podcasts}
          onPreferencesChange={updatePodcastPreferences}
          onStatusChange={updateEpisodeStatus}
        />
      )}
    </div>
  );
}
