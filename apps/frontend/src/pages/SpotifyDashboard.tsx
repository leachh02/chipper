import { useEffect, useState } from "react";
import ConnectButton from "../components/spotify/ConnectButton";
import AlbumsView from "../components/spotify/AlbumsView";
import {
  handleSpotifyCallback,
  ensureValidToken,
  getAllSavedAlbums,
} from "../utils/spotify";
import { getAllAlbums, saveAlbumsToDB } from "../db/queries";
import type { Album } from "../types";

export default function SpotifyDashboard() {
  const [loading, setLoading] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const cached = await getAllAlbums();
      if (cached.length > 0) {
        setAlbums(cached);
        setLoading(false);
        setIsAuthenticated(true);
        return;
      }
      await handleSpotifyCallback();
      await ensureValidToken();

      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const savedAlbums = await getAllSavedAlbums();
      setAlbums(savedAlbums);
      saveAlbumsToDB(savedAlbums);

      setLoading(false);
    }

    init();
  }, []);

  const filtered = albums?.filter((a) => {
    const query = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.artist.toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="p-6">Loading...</div>;
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">
        Chip List: Spotify Podcasts & Albums
      </h1>
      <input
        type="text"
        className="border p-2 flex-grow"
        placeholder="Search by album or artist..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {isAuthenticated ? (
        <AlbumsView albums={filtered} setAlbums={setAlbums} />
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
