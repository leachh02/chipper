import { loginWithSpotifyClick } from "../../utils/spotify";

export default function ConnectButton() {
  return (
    <button
      className="border p-2 rounded mt-4 mb-6"
      onClick={loginWithSpotifyClick}
    >
      Connect to Spotify
    </button>
  );
}
