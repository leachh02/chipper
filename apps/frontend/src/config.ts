// Everything a copy of Chipper can be configured with, read from .env at
// build time, or for the Spotify client ID, from a Chipper server. Only
// the Spotify client ID has no default.
const env = import.meta.env;

// The ID that apps/extension's manifest key gives the unpacked extension.
// Set VITE_EXTENSIONS_ID to use another, or several separated by commas
// (say, the unpacked one and the published one); each is tried in turn.
const UNPACKED_EXTENSION_ID = "ldgdfonogoclfkekjihefgobappiechp";

export const EXTENSION_IDS: string[] = (env.VITE_EXTENSIONS_ID || UNPACKED_EXTENSION_ID)
  .split(",")
  .map((id: string) => id.trim())
  .filter(Boolean);

// Where the extension works with no setup (its manifest lists these). On
// any other address, such as a server on your network, it has to be added
// in the extension's options first.
const EXTENSION_HOSTS = ["localhost", "127.0.0.1", "leachh02.github.io"];
export const EXTENSION_NEEDS_ADDRESS =
  typeof window !== "undefined" && !EXTENSION_HOSTS.includes(window.location.hostname);

declare global {
  interface Window {
    // Set by a Chipper server's /config.js, so its published image needs
    // no settings at build time
    CHIPPER_CONFIG?: { spotifyClientId?: string };
  }
}
const fromServer = typeof window === "undefined" ? undefined : window.CHIPPER_CONFIG;

const spotifyClientId: string = fromServer?.spotifyClientId || env.VITE_SPOTIFY_CLIENT_ID || "";

export const SPOTIFY = {
  // Spotify caps an app in Development Mode at 5 users, so a public copy
  // of Chipper leaves this out and Spotify is hidden
  enabled: !!spotifyClientId,
  clientId: spotifyClientId,
  // Add this to the redirect URIs of your app on the Spotify dashboard
  // (Tests run outside a browser, where there's no window)
  redirectUrl:
    env.VITE_SPOTIFY_REDIRECT_URL ||
    `${typeof window === "undefined" ? "" : window.location.origin}${import.meta.env.BASE_URL}dashboard/spotify`,
  authorizationEndpoint:
    env.VITE_SPOTIFY_AUTHORIZATION_ENDPOINT || "https://accounts.spotify.com/authorize",
  tokenEndpoint: env.VITE_SPOTIFY_TOKEN_ENDPOINT || "https://accounts.spotify.com/api/token",
  // user-read-playback-position shows how far through each saved episode you are
  scope: env.VITE_SPOTIFY_SCOPE || "user-library-read user-read-playback-position",
};

// Set by the self-hosted server's build (see apps/backend), which serves
// this app and the sync API from the same address
export const SERVER = {
  enabled: env.VITE_SERVER === "true",
};
