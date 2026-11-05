import { toggleAlbumStatus } from "../../db/queries";
import type { Album } from "../../types";

type AlbumsProps = {
  albums: Album[];
  setAlbums: (albums: Album[]) => void;
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
                album.status === "completed" ? "opacity-40" : "opacity-100"
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
                <button
                  className="text-sm underline"
                  onClick={() => handleToggle(album.id, albums, setAlbums)}
                >
                  {album.status === "completed"
                    ? "Mark as Unheard"
                    : "Mark as Completed"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function handleToggle(
  id: string,
  albums: Album[],
  setAlbums: (albums: Album[]) => void,
) {
  const updatedAlbum = await toggleAlbumStatus(id);
  const reloadAlbums = albums.map((a) => (a.id === id ? updatedAlbum! : a));
  setAlbums(reloadAlbums);
  //   await reloadAlbums(); // however you're refreshing state
}
