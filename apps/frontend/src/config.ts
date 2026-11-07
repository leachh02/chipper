// Everything a copy of Chipper can be configured with, read from .env at
// build time. Only the Spotify client ID has no default.
const env = import.meta.env;

// The ID that apps/extension's manifest key gives the unpacked extension.
// Set VITE_EXTENSIONS_ID to use another, or several separated by commas
// (say, the unpacked one and the published one); each is tried in turn.
const UNPACKED_EXTENSION_ID = "ldgdfonogoclfkekjihefgobappiechp";

export const EXTENSION_IDS: string[] = (env.VITE_EXTENSIONS_ID || UNPACKED_EXTENSION_ID)
  .split(",")
  .map((id: string) => id.trim())
  .filter(Boolean);

const spotifyClientId: string = env.VITE_SPOTIFY_CLIENT_ID ?? "";

export const SPOTIFY = {
  // Spotify caps an app in Development Mode at 5 users, so a public copy
  // of Chipper leaves this out and Spotify is hidden
  enabled: !!spotifyClientId,
  clientId: spotifyClientId,
  // Add this to the redirect URIs of your app on the Spotify dashboard
  redirectUrl: env.VITE_SPOTIFY_REDIRECT_URL || `${window.location.origin}/dashboard/spotify`,
  authorizationEndpoint:
    env.VITE_SPOTIFY_AUTHORIZATION_ENDPOINT || "https://accounts.spotify.com/authorize",
  tokenEndpoint: env.VITE_SPOTIFY_TOKEN_ENDPOINT || "https://accounts.spotify.com/api/token",
  // user-read-playback-position shows how far through each saved episode you are
  scope: env.VITE_SPOTIFY_SCOPE || "user-library-read user-read-playback-position",
};
