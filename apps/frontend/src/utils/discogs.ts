import type { Album } from "../types";

// Genres come from the Discogs masters data dump (data.discogs.com, CC0).
// A master is an album across all its pressings, e.g.
//   <master id="1"><artists><artist><name>Nirvana (2)</name>...</artist></artists>
//   <genres><genre>Rock</genre></genres><styles><style>Grunge</style></styles>
//   <year>1991</year><title>Nevermind</title>...<videos>...</videos></master>
// The file is far too big to keep, so we stream it and only hold on to the
// masters that match an album in the library.

export const DISCOGS_DUMPS_URL = "https://data.discogs.com/?prefix=data/";

// Words that mark a reissue rather than a different album, as in
// "Rumours - 2004 Remaster" or "Blue (Deluxe Edition)"
const EDITION_SUFFIX =
  /\s+-\s+[^-]*\b(remaster(ed)?|deluxe|edition|version|anniversary|expanded|reissue|mono|stereo|bonus)\b.*$/i;

// Lowercase, no accents, no bracketed extras, "&" as "and", no leading "the",
// letters and digits only. Discogs's " (2)" artist suffixes go with the brackets.
export function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(EDITION_SUFFIX, "")
    .replace(/\s*[([][^)\]]*[)\]]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/^the\s+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function key(artist: string, title: string) {
  return `${normalise(artist)}|${normalise(title)}`;
}

function decodeEntities(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

function allText(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}>([^<]*)</${tag}>`, "g");
  return [...xml.matchAll(pattern)].map((m) => decodeEntities(m[1]).trim());
}

type Master = { artists: string[]; title: string; genres: string[] };

export function parseMaster(xml: string): Master | null {
  // Videos and tracks have titles of their own, so drop them first
  const body = xml.replace(/<(videos|images|tracks)>[\s\S]*?<\/\1>/g, "");
  const artistsXml = body.match(/<artists>([\s\S]*?)<\/artists>/)?.[1] ?? "";
  const title = allText(body.replace(/<artists>[\s\S]*?<\/artists>/, ""), "title")[0];
  if (!title) return null;

  return {
    artists: allText(artistsXml, "name"),
    title,
    // Broad genres first, then the more specific styles
    genres: [...new Set([...allText(body, "genre"), ...allText(body, "style")])],
  };
}

// Spotify joins several artists with ", ", but some names contain a comma
// ("Tyler, The Creator"), so try the whole string as well as each part
function albumKeys(album: Album): string[] {
  const names = new Set([album.artist, ...album.artist.split(", ")]);
  return [...names].filter(Boolean).map((name) => key(name, album.name));
}

export type GenreMatches = {
  genresById: Map<string, string[]>;
  checked: number;
  matched: number;
};

// Reads a masters dump (.xml.gz, or .xml if you've unzipped it) and returns
// the genres for every album it found. onProgress gets a value from 0 to 1.
export async function matchDiscogsGenres(
  file: File,
  albums: Album[],
  onProgress: (fraction: number) => void,
): Promise<GenreMatches> {
  const idsByKey = new Map<string, string[]>();
  for (const album of albums) {
    for (const k of albumKeys(album)) {
      idsByKey.set(k, [...(idsByKey.get(k) ?? []), album.id]);
    }
  }

  const found = new Map<string, Set<string>>();
  let bytesRead = 0;
  const countBytes = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      bytesRead += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });

  let stream: ReadableStream<Uint8Array> = file.stream().pipeThrough(countBytes);
  if (file.name.endsWith(".gz")) {
    stream = stream.pipeThrough(
      new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>,
    );
  }
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();

  let buffer = "";
  let sawMaster = false;
  let lastReport = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;

    const masters = buffer.split("</master>");
    buffer = masters.pop() ?? "";

    for (const xml of masters) {
      sawMaster ||= xml.includes("<master ");
      const master = parseMaster(xml);
      if (!master || !master.genres.length) continue;

      for (const artist of master.artists) {
        for (const id of idsByKey.get(key(artist, master.title)) ?? []) {
          const genres = found.get(id) ?? new Set();
          master.genres.forEach((g) => genres.add(g));
          found.set(id, genres);
        }
      }
    }

    if (bytesRead - lastReport > 1_000_000) {
      lastReport = bytesRead;
      onProgress(bytesRead / file.size);
    }
  }

  if (!sawMaster) {
    throw new Error(
      "That doesn't look like a Discogs masters file. Download the one named discogs_…_masters.xml.gz",
    );
  }

  const genresById = new Map<string, string[]>();
  for (const album of albums) {
    genresById.set(album.id, [...(found.get(album.id) ?? [])]);
  }
  return { genresById, checked: albums.length, matched: found.size };
}
