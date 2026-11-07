import type { ReactNode } from "react";
import { FaCheck, FaForward, FaHeadphones, FaHeart, FaRegHeart } from "react-icons/fa";
import { MdQueueMusic } from "react-icons/md";
import type { Album, ChipStatus } from "../../types";
import ChipActions, { ToggleButton } from "../ChipActions";
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
};

export default function AlbumCard({ album, onStatusChange, onFlagsChange }: Props) {
  const details = [
    releaseYear(album.release_date),
    `${album.total_tracks} ${album.total_tracks === 1 ? "track" : "tracks"}`,
    album.runtime_ms ? formatRuntime(album.runtime_ms) : null,
  ].filter(Boolean);

  return (
    <div
      className={`border rounded p-3 flex flex-col gap-2 ${
        album.upNext ? "border-current" : "border-gray-300 dark:border-gray-700"
      }`}
    >
      <a href={album.url} target="_blank" rel="noreferrer" title="Open in Spotify">
        {album.image ? (
          <img
            src={album.image}
            alt=""
            loading="lazy"
            className="w-full aspect-square object-cover rounded"
          />
        ) : (
          <div className="w-full aspect-square rounded bg-gray-200 dark:bg-gray-800" />
        )}
      </a>

      <div className="min-w-0">
        <div className="font-semibold leading-tight line-clamp-2" title={album.name}>
          {album.name}
        </div>
        <div className="text-sm text-gray-500 truncate" title={album.artist}>
          {album.artist}
        </div>
        <div className="text-xs text-gray-500">{details.join(" · ")}</div>
        {album.genres.length > 0 && (
          <div className="text-xs text-gray-500 truncate" title={album.genres.join(", ")}>
            {album.genres.slice(0, 2).join(", ")}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-1 mt-auto">
        <ChipActions
          status={album.status}
          labels={ALBUM_ACTIONS}
          icons={ALBUM_ICONS}
          onChange={(status) => onStatusChange(album.id, status)}
        />
        <div className="flex gap-1">
          <ToggleButton
            active={!!album.upNext}
            label="Up next"
            icon={<MdQueueMusic />}
            onClick={() => onFlagsChange(album.id, { upNext: !album.upNext })}
          />
          <ToggleButton
            active={!!album.loved}
            label="Love"
            icon={album.loved ? <FaHeart /> : <FaRegHeart />}
            onClick={() => onFlagsChange(album.id, { loved: !album.loved })}
          />
        </div>
      </div>
    </div>
  );
}
