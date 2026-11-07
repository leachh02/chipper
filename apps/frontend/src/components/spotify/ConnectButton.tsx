import { loginWithSpotifyClick } from "../../utils/spotify";

export default function ConnectButton() {
  return (
    <button
      className="btn btn-primary"
      onClick={loginWithSpotifyClick}
    >
      Connect to Spotify
    </button>
  );
}
