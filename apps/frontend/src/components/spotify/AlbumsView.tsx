import { setAlbumStatus } from "../../db/queries";
import type { Album, ChipStatus } from "../../types";
import ChipActions from "../ChipActions";

type AlbumsProps = {
  albums: Album[];
  setAlbums: (albums: Album[]) => void;
};

const ALBUM_ACTIONS: Partial<Record<ChipStatus, string>> = {
  in_progress: "Listening",
  completed: "Listened",
  deferred: "Later",
  skipped: "Skip",
};

export default function AlbumsView({ albums, setAlbums }: AlbumsProps) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Your Saved Albums</h1>

      <div className="grid grid-cols-5 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {albums.map((album) => {
          return (
            <div
              key={album?.id}
              className={`border p-4 rounded transition-opacity ${
                album.status === "completed" || album.status === "skipped"
                  ? "opacity-40"
                  : "opacity-100"
              }`}
            >
              {/* <div key={album?.id} className="flex flex-col "> */}
              <img
                src={album?.image ?? ""}
                className="w-16 h-16 object-cover rounded mr-4 float-left"
              />
              <div className="font-semibold">{album?.name}</div>
              <div className="text-sm text-gray-500">
                {album?.artist}
                {/* {album?.artists.map((a: any) => a.name).join(", ")} */}
                <ChipActions
                  status={album.status}
                  labels={ALBUM_ACTIONS}
                  onChange={(status) =>
                    handleStatus(album.id, status, albums, setAlbums)
                  }
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function handleStatus(
  id: string,
  status: ChipStatus,
  albums: Album[],
  setAlbums: (albums: Album[]) => void,
) {
  const updatedAlbum = await setAlbumStatus(id, status);
  if (!updatedAlbum) return;
  setAlbums(albums.map((a) => (a.id === id ? updatedAlbum : a)));
}
