import { SPOTIFY } from "../../config";
import { loginWithSpotifyClick } from "../../utils/spotify";

export default function ConnectButton() {
  return (
    <button
      className="btn btn-primary"
      disabled={!SPOTIFY.canSignIn}
      onClick={loginWithSpotifyClick}
    >
      Connect to Spotify
    </button>
  );
}
