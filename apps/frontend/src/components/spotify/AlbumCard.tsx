import { useState, type ReactNode } from "react";
import { FaCheck, FaForward, FaHeadphones, FaHeart, FaRegHeart, FaTag } from "react-icons/fa";
import { MdQueueMusic } from "react-icons/md";
import type { Album, ChipStatus } from "../../types";
import ChipActions from "../ChipActions";
import GenreEditor from "./GenreEditor";
import { formatRuntime, releaseYear } from "../../utils/format";

const ALBUM_ACTIONS: Partial<Record<ChipStatus, string>> = {
  in_progress: "Listening",
  completed: "Listened",
  skipped: "Skip",
};

const ALBUM_ICONS: Partial<Record<ChipStatus, ReactNode>> = {
  in_progress: <FaHeadphones />,
  completed: <FaCheck />,
  skipped: <FaForward />,
};

type Props = {
  album: Album;
  onStatusChange: (id: string, status: ChipStatus) => void;
  onFlagsChange: (id: string, flags: Pick<Album, "upNext" | "loved">) => void;
  onGenresChange: (id: string, genres: string[]) => void;
};

export default function AlbumCard({
  album,
  onStatusChange,
  onFlagsChange,
  onGenresChange,
}: Props) {
  const [editingGenres, setEditingGenres] = useState(false);
  const details = [
    releaseYear(album.release_date),
    `${album.total_tracks} ${album.total_tracks === 1 ? "track" : "tracks"}`,
    album.runtime_ms ? formatRuntime(album.runtime_ms) : null,
  ].filter(Boolean);

  return (
    <div
      className={`card flex flex-col overflow-hidden ${
        album.upNext ? "border-accent ring-1 ring-accent" : ""
      }`}
    >
      <div className="relative">
        <a href={album.url} target="_blank" rel="noreferrer" title="Open in Spotify">
          {album.image ? (
            <img
              src={album.image}
              alt=""
              loading="lazy"
              className="w-full aspect-square object-cover bg-surface-2"
            />
          ) : (
            <div className="w-full aspect-square bg-surface-2" />
          )}
        </a>
        <div className="absolute right-2 top-2 flex gap-1">
          <ArtButton
            active={!!album.upNext}
            label="Shortlist"
            onClick={() => onFlagsChange(album.id, { upNext: !album.upNext })}
          >
            <MdQueueMusic />
          </ArtButton>
          <ArtButton
            active={!!album.loved}
            label="Love"
            onClick={() => onFlagsChange(album.id, { loved: !album.loved })}
          >
            {album.loved ? <FaHeart /> : <FaRegHeart />}
          </ArtButton>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium leading-snug line-clamp-2" title={album.name}>
            {album.name}
          </div>
          <div className="text-xs text-muted truncate" title={album.artist}>
            {album.artist}
          </div>
          <div className="text-xs text-muted">{details.join(" · ")}</div>
          {editingGenres ? (
            <div className="mt-2">
              <GenreEditor
                genres={album.genres}
                onChange={(genres) => onGenresChange(album.id, genres)}
                onDone={() => setEditingGenres(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              className="mt-1 flex items-center gap-1 max-w-full text-xs text-muted hover:text-fg"
              title={
                album.genres.length ? `${album.genres.join(", ")} (click to edit)` : "Add genres"
              }
              onClick={() => setEditingGenres(true)}
            >
              <FaTag className="shrink-0" />
              <span className="truncate">
                {album.genres.length ? album.genres.slice(0, 2).join(", ") : "Add genres"}
              </span>
            </button>
          )}
        </div>

        <div className="mt-auto">
          <ChipActions
            status={album.status}
            labels={ALBUM_ACTIONS}
            icons={ALBUM_ICONS}
            onChange={(status) => onStatusChange(album.id, status)}
          />
        </div>
      </div>
    </div>
  );
}

// A round button over the cover art, readable on any artwork
function ArtButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full shadow backdrop-blur transition-colors ${
        active ? "bg-accent text-on-accent" : "bg-black/45 text-white hover:bg-black/65"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
