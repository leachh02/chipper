/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code with PKCE oAuth2 flow to authenticate
 * against the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

import type { Album, Episode } from "../types";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type SpotifyArtist = { id: string; name: string };

type SpotifyTrack = { duration_ms: number };

type SpotifySavedAlbum = {
  added_at: string;
  album: {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    release_date: string;
    total_tracks: number;
    images?: { url: string }[];
    tracks: { items: SpotifyTrack[]; next: string | null };
    external_urls: { spotify: string };
  };
};

type SpotifySavedEpisode = {
  added_at: string;
  episode: {
    id: string;
    name: string;
    release_date: string;
    duration_ms: number;
    images?: { url: string }[];
    external_urls: { spotify: string };
    show?: { name: string; images?: { url: string }[] };
    resume_point?: { fully_played: boolean; resume_position_ms: number };
  };
};

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUrl = import.meta.env.VITE_SPOTIFY_REDIRECT_URL;

const authorizationEndpoint = import.meta.env
  .VITE_SPOTIFY_AUTHORIZATION_ENDPOINT;
const tokenEndpoint = import.meta.env.VITE_SPOTIFY_TOKEN_ENDPOINT;
const scope = import.meta.env.VITE_SPOTIFY_SCOPE;

// Data structure that manages the current active token, caching it in localStorage
const currentToken = {
  get access_token() {
    return localStorage.getItem("access_token") || null;
  },
  get refresh_token() {
    return localStorage.getItem("refresh_token") || null;
  },
  get expires_in() {
    return localStorage.getItem("expires_in") || null;
  },
  get expires() {
    return localStorage.getItem("expires") || null;
  },

  save: function (response: TokenResponse) {
    const { access_token, refresh_token, expires_in } = response;
    localStorage.setItem("access_token", access_token);
    // Refreshes don't always come with a new refresh token
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("expires_in", expires_in.toString());

    const now = new Date();
    const expiry = new Date(now.getTime() + expires_in * 1000);
    localStorage.setItem("expires", expiry.toISOString());
  },
};

let tokenExchangeInProgress = false;

export async function handleSpotifyCallback() {
  if (tokenExchangeInProgress) return;

  const args = new URLSearchParams(window.location.search);
  const code = args.get("code");

  if (!code) return;

  tokenExchangeInProgress = true;

  const token = await getToken(code);
  currentToken.save(token);

  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  window.history.replaceState({}, document.title, url.toString());
}

export async function ensureValidToken() {
  const expires = localStorage.getItem("expires");
  if (!expires) return;

  if (new Date(expires) < new Date()) {
    const newToken = await refreshToken();
    currentToken.save(newToken);
  }
}

// If we have a token, we're logged in, so fetch user data and render logged in template
// if (currentToken.access_token) {
//   const userData = await getUserData();
//   renderTemplate("main", "logged-in-template", userData);
//   renderTemplate("oauth", "oauth-template", currentToken);
// }

// // Otherwise we're not logged in, so render the login template
// if (!currentToken.access_token) {
//   renderTemplate("main", "login");
// }

async function redirectToSpotifyAuthorize() {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(64));
  const randomString = randomValues.reduce(
    (acc, x) => acc + possible[x % possible.length],
    "",
  );

  const code_verifier = randomString;
  const data = new TextEncoder().encode(code_verifier);
  const hashed = await crypto.subtle.digest("SHA-256", data);

  const code_challenge_base64 = btoa(
    String.fromCharCode(...new Uint8Array(hashed)),
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  window.localStorage.setItem("code_verifier", code_verifier);

  const authUrl = new URL(authorizationEndpoint);
  const params = {
    response_type: "code",
    client_id: clientId,
    scope: scope,
    code_challenge_method: "S256",
    code_challenge: code_challenge_base64,
    redirect_uri: redirectUrl,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString(); // Redirect the user to the authorization server for login
}

async function readTokenResponse(response: Response): Promise<TokenResponse> {
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Spotify sign-in failed");
  }
  return data;
}

// Spotify API Calls
async function getToken(code: string) {
  const code_verifier = localStorage.getItem("code_verifier") || "";

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUrl,
      code_verifier: code_verifier,
    }),
  });

  return await readTokenResponse(response);
}

async function refreshToken() {
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: currentToken.refresh_token || "",
    }),
  });

  return await readTokenResponse(response);
}

const API_URL = "https://api.spotify.com/v1";
const SIGN_IN_EXPIRED = "Your Spotify sign-in has expired. Use Reconnect Spotify.";

type Page<T> = { items: T[]; next: string | null };

// GET from the Web API. Refreshes an expired token once, waits out rate
// limits, and turns any other failure into an Error.
async function spotifyGet<T>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : API_URL + pathOrUrl;
  let refreshed = false;

  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {
      headers: { Authorization: "Bearer " + currentToken.access_token },
    });

    if (response.ok) return response.json();

    if (response.status === 401 && !refreshed) {
      try {
        currentToken.save(await refreshToken());
      } catch {
        throw new Error(SIGN_IN_EXPIRED);
      }
      refreshed = true;
      continue;
    }

    if (response.status === 429) {
      const waitSeconds = Number(response.headers.get("Retry-After")) || 2;
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    throw new Error(
      response.status === 401
        ? SIGN_IN_EXPIRED
        : `Spotify returned ${response.status} for ${new URL(url).pathname}.`,
    );
  }

  throw new Error("Spotify is rate limiting requests. Try again in a minute.");
}

async function getAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | null = path;
  while (next) {
    const page: Page<T> = await spotifyGet<Page<T>>(next);
    items.push(...page.items);
    next = page.next;
  }
  return items;
}

export async function getAllSavedAlbums(): Promise<Album[]> {
  const saved = await getAllPages<SpotifySavedAlbum>("/me/albums?limit=50");

  // The album object only includes its first 50 tracks
  for (const { album } of saved) {
    if (album.tracks.next) {
      const rest = await getAllPages<SpotifyTrack>(album.tracks.next);
      album.tracks.items.push(...rest);
    }
  }

  return saved.map(simplifyAlbum);
}

export async function getSavedEpisodes(): Promise<Episode[]> {
  const saved = await getAllPages<SpotifySavedEpisode>("/me/episodes?limit=50");
  return saved.map(simplifyEpisode);
}

// Spotify has deprecated artist genres, so many come back empty. Batch
// artist lookups were removed in February 2026, so this is one request each.
export async function getArtistGenres(artistId: string): Promise<string[]> {
  const artist = await spotifyGet<{ genres?: string[] }>(`/artists/${artistId}`);
  return artist.genres ?? [];
}

function simplifyAlbum(item: SpotifySavedAlbum): Album {
  return {
    id: item.album.id,
    name: item.album.name,
    artist: item.album.artists.map((a) => a.name).join(", "),
    artist_id: item.album.artists.map((a) => a.id).join(", "),
    release_date: item.album.release_date,
    genres: [],
    runtime_ms: item.album.tracks.items.reduce(
      (acc, track) => acc + track.duration_ms,
      0,
    ),
    image: item.album.images?.[0]?.url ?? "",
    added_at: item.added_at,
    total_tracks: item.album.total_tracks,
    status: "queued",
    completed_at: null,
    rating: null,
    url: item.album.external_urls.spotify,
    last_synced: Date.now().toString(),
  };
}

function simplifyEpisode({ episode, added_at }: SpotifySavedEpisode): Episode {
  const resume = episode.resume_point;
  return {
    id: episode.id,
    name: episode.name,
    show: episode.show?.name ?? "",
    image: episode.images?.[0]?.url ?? episode.show?.images?.[0]?.url ?? "",
    release_date: episode.release_date,
    duration_ms: episode.duration_ms,
    resume_position_ms: resume?.resume_position_ms ?? 0,
    url: episode.external_urls.spotify,
    added_at,
    // Spotify's progress, only shared with the playback position scope
    status: resume?.fully_played
      ? "completed"
      : resume?.resume_position_ms
        ? "in_progress"
        : "queued",
  };
}

// Click handlers
export async function loginWithSpotifyClick() {
  await redirectToSpotifyAuthorize();
}

export async function logoutClick() {
  localStorage.clear();
  window.location.href = redirectUrl;
}

// async function refreshTokenClick() {
//   const token = await refreshToken();
//   currentToken.save(token);
//   renderTemplate("oauth", "oauth-template", currentToken);
// }

// // HTML Template Rendering with basic data binding - demoware only.
// function renderTemplate(
//   targetId: string,
//   templateId: string,
//   data: any = null,
// ) {
//   const template = document.getElementById(templateId) as HTMLTemplateElement;
//   const clone = template?.content?.cloneNode(true) as Element;

//   const elements = clone.querySelectorAll("*");
//   elements.forEach((ele: any) => {
//     const bindingAttrs = [...ele.attributes].filter((a) =>
//       a.name.startsWith("data-bind"),
//     );

//     bindingAttrs.forEach((attr) => {
//       const target = attr.name
//         .replace(/data-bind-/, "")
//         .replace(/data-bind/, "");
//       const targetType = target.startsWith("onclick") ? "HANDLER" : "PROPERTY";
//       const targetProp = target === "" ? "innerHTML" : target;

//       const prefix = targetType === "PROPERTY" ? "data." : "";
//       const expression = prefix + attr.value.replace(/;\n\r\n/g, "");

//       // Maybe use a framework with more validation here ;)
//       try {
//         ele[targetProp] =
//           targetType === "PROPERTY"
//             ? eval(expression)
//             : () => {
//                 eval(expression);
//               };
//         ele.removeAttribute(attr.name);
//       } catch (ex) {
//         console.error(`Error binding ${expression} to ${targetProp}`, ex);
//       }
//     });
//   });

//   const target = document.getElementById(targetId);
//   if (target) {
//     target.innerHTML = "";
//     target.appendChild(clone);
//   }
// }
