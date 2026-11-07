import { useState } from "react";
import { NO_GENRE } from "../../types";
import type { Album, ChipStatus, SpotifyPreferences } from "../../types";
import AlbumCard from "./AlbumCard";
import { formatRuntime, releaseYear } from "../../utils/format";

const STATUS_FILTERS: { label: string; status: ChipStatus }[] = [
  { label: "Not heard", status: "queued" },
  { label: "Listening", status: "in_progress" },
  { label: "Listened", status: "completed" },
  { label: "Skipped", status: "skipped" },
];

const SORTS: { label: string; value: SpotifyPreferences["sortBy"] }[] = [
  { label: "Date added", value: "added" },
  { label: "Release date", value: "release" },
  { label: "Artist", value: "artist" },
  { label: "Album name", value: "name" },
  { label: "Runtime", value: "runtime" },
];

type Props = {
  albums: Album[];
  preferences: SpotifyPreferences;
  onPreferencesChange: (changes: Partial<SpotifyPreferences>) => void;
  onStatusChange: (id: string, status: ChipStatus) => void;
  onFlagsChange: (id: string, flags: Pick<Album, "upNext" | "loved">) => void;
  onGenresChange: (id: string, genres: string[]) => void;
};

export default function AlbumsView({
  albums,
  preferences,
  onPreferencesChange,
  onStatusChange,
  onFlagsChange,
  onGenresChange,
}: Props) {
  const [search, setSearch] = useState("");
  const { sortBy, sortOrder, decade, genre, statusFilter, upNextOnly, lovedOnly } =
    preferences;

  const decades = [
    ...new Set(
      albums
        .map((a) => releaseYear(a.release_date))
        .filter((year): year is number => year !== null)
        .map((year) => Math.floor(year / 10) * 10),
    ),
  ].sort((a, b) => b - a);

  const genreCounts = new Map<string, number>();
  for (const album of albums) {
    for (const g of album.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const genres = [...genreCounts].sort((a, b) => b[1] - a[1]);
  const noGenreCount = albums.filter(
    (a) => a.genresCheckedAt && a.genres.length === 0,
  ).length;

  const query = search.toLowerCase();
  const filtered = albums.filter((a) => {
    const year = releaseYear(a.release_date);
    return (
      statusFilter.includes(a.status) &&
      (!upNextOnly || a.upNext) &&
      (!lovedOnly || a.loved) &&
      (decade === null || (year !== null && Math.floor(year / 10) * 10 === decade)) &&
      (genre === null ||
        (genre === NO_GENRE
          ? !!a.genresCheckedAt && a.genres.length === 0
          : a.genres.includes(genre))) &&
      (a.name.toLowerCase().includes(query) || a.artist.toLowerCase().includes(query))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    // Shortlisted albums always come first
    if (!!a.upNext !== !!b.upNext) return a.upNext ? -1 : 1;

    let cmp = 0;
    if (sortBy === "added") cmp = a.added_at.localeCompare(b.added_at);
    else if (sortBy === "release") cmp = a.release_date.localeCompare(b.release_date);
    else if (sortBy === "runtime") cmp = a.runtime_ms - b.runtime_ms;
    else {
      const key = sortBy === "artist" ? "artist" : "name";
      cmp = a[key].localeCompare(b[key], undefined, { sensitivity: "base" });
    }
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const totalMs = sorted.reduce((sum, a) => sum + a.runtime_ms, 0);

  return (
    <div>
      <div className="card my-4 flex flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          className="input min-w-0 flex-1 basis-48"
          aria-label="Search"
          placeholder="Search by album or artist"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input"
          aria-label="Sort by"
          value={sortBy}
          onChange={(e) =>
            onPreferencesChange({ sortBy: e.target.value as typeof sortBy })
          }
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="input"
          aria-label="Sort order"
          value={sortOrder}
          onChange={(e) =>
            onPreferencesChange({ sortOrder: e.target.value as typeof sortOrder })
          }
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
        <select
          className="input"
          aria-label="Decade"
          value={decade ?? ""}
          onChange={(e) =>
            onPreferencesChange({
              decade: e.target.value ? Number(e.target.value) : null,
            })
          }
        >
          <option value="">All decades</option>
          {decades.map((d) => (
            <option key={d} value={d}>
              {d}s
            </option>
          ))}
        </select>
        <select
          className="input max-w-48"
          aria-label="Genre"
          value={genre ?? ""}
          onChange={(e) => onPreferencesChange({ genre: e.target.value || null })}
        >
          <option value="">All genres</option>
          {genres.map(([g, count]) => (
            <option key={g} value={g}>
              {g} ({count})
            </option>
          ))}
          {noGenreCount > 0 && (
            <option value={NO_GENRE}>No genre found ({noGenreCount})</option>
          )}
        </select>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={upNextOnly}
            onChange={() => onPreferencesChange({ upNextOnly: !upNextOnly })}
          />
          Shortlist only
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lovedOnly}
            onChange={() => onPreferencesChange({ lovedOnly: !lovedOnly })}
          />
          Loved only
        </label>
      </div>

      </div>

      <p className="mb-3 text-sm text-muted">
        {sorted.length} {sorted.length === 1 ? "album" : "albums"} ·{" "}
        {formatRuntime(totalMs)} of listening
      </p>

      <datalist id="album-genres">
        {genres.map(([g]) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4">
        {sorted.map((album) => (
          <AlbumCard
            key={album.id}
            album={album}
            onStatusChange={onStatusChange}
            onFlagsChange={onFlagsChange}
            onGenresChange={onGenresChange}
          />
        ))}
      </div>
    </div>
  );
}
