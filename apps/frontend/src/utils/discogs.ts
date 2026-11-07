import type { Album } from "../types";

// Genres come from the Discogs masters data dump (data.discogs.com, CC0).
// A master is an album across all its pressings, e.g.
//   <master id="1"><artists><artist><name>Nirvana (2)</name>...</artist></artists>
//   <genres><genre>Rock</genre></genres><styles><style>Grunge</style></styles>
//   <year>1991</year><title>Nevermind</title>...<videos>...</videos></master>
// The file is far too big to keep, so we stream it and only hold on to the
// masters that match an album in the library.

export const DISCOGS_DUMPS_URL = "https://data.discogs.com/?prefix=data/";

const EDITION_WORDS =
  "remaster(ed)?|deluxe|edition|version|anniversary|expanded|reissue|mono|stereo|bonus|mix";

// A reissue rather than a different album, as in "Rumours - 2004 Remaster"
const EDITION_AFTER_DASH = new RegExp(`\\s+-\\s+[^-]*\\b(${EDITION_WORDS})\\b.*$`, "i");

// The same with no dash or brackets, as in "Slowhand 35th Anniversary",
// "Black Bastards Deluxe Edition", "Another Sunny Day -Remastered-" or "Resolution - EP"
const EDITION_AT_END =
  /[\s-]+((\d+(st|nd|rd|th)\s+)?anniversary(\s+edition)?|(deluxe|special|expanded)(\s+(edition|version))?|-?remastered-?|ep)$/i;

function stripBrackets(text: string) {
  const stripped = text.replace(/\s*[([][^)\]]*[)\]]/g, "").trim();
  // Keep a title that's entirely in brackets, like "(Pronounced 'Lĕh-'nérd...)"
  return stripped || text.replace(/[()[\]]/g, "");
}

// Lowercase, no accents, no bracketed extras or edition words, "&" as "and",
// "$" as "s", no leading "the", letters and digits only. Discogs's " (2)"
// artist suffixes go with the brackets.
export function normalise(text: string): string {
  return stripBrackets(text.normalize("NFKD").replace(/[̀-ͯ]/g, ""))
    .replace(EDITION_AFTER_DASH, "")
    .replace(EDITION_AT_END, "")
    .replace(/\bSt\.?$/i, "Street")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\$/g, "s")
    .replace(/^the\s+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

// Ways the same album might be titled: in full, then without a subtitle
// after ":" or " - " ("Ambient 1: Music For Airports", "Legend - The Best Of..."),
// then keeping what's in brackets ("Black Panther The Album (Music From...)")
function titleVariants(title: string): string[] {
  const full = normalise(title);
  const short = [title.split(":")[0], title.split(" - ")[0], title.replace(/[()[\]]/g, " ")]
    .map(normalise)
    .filter((t) => t && t !== full);
  return [full, ...new Set(short)];
}

// Spotify joins several artists with ", ", but some names contain a comma
// ("Tyler, The Creator"), so keep the whole string as well as each part
function spotifyArtists(album: Album): string[] {
  return [...new Set([album.artist, ...album.artist.split(", ")])]
    .map(normalise)
    .filter(Boolean);
}

// The same artist written differently: "Jimi Hendrix" and "The Jimi Hendrix
// Experience", "Blu, Exile" and "Blu & Exile", "Yusuf / Cat Stevens" and
// "Cat Stevens". Very short names have to match exactly.
function sameArtist(a: string, b: string) {
  if (a === b) return true;
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  return shorter.length >= 4 && longer.includes(shorter);
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
  // Videos, which come last, have titles of their own
  const body = xml.split("<videos>")[0];
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

// Discogs titles sometimes start with the artist ("Black Sabbath Vol 4",
// "Frank Sinatra Sings For Only The Lonely"), so also try them without it
function masterTitleVariants(master: Master, artists: string[]): string[] {
  const variants = titleVariants(master.title);
  for (const artist of artists) {
    const rest = variants[0].startsWith(artist) ? variants[0].slice(artist.length) : "";
    if (rest) variants.push(rest);
  }
  return variants;
}

type Candidate = { id: string; artists: string[]; quality: number };

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
  // Every title an album might go by. Matches are ranked, best first: full
  // title, then a shortened one; within those, the exact artist name, then a
  // looser one. Only an album's best rank counts, so Queen's "Greatest Hits"
  // doesn't pick up Queensrÿche's.
  const byTitle = new Map<string, Candidate[]>();
  for (const album of albums) {
    const artists = spotifyArtists(album);
    titleVariants(album.name).forEach((title, i) => {
      const candidate = { id: album.id, artists, quality: i === 0 ? 0 : 1 };
      byTitle.set(title, [...(byTitle.get(title) ?? []), candidate]);
    });
  }

  const found = new Map<string, { quality: number; genres: Set<string> }>();
  function addMatch(id: string, quality: number, genres: string[]) {
    const current = found.get(id);
    if (current && current.quality < quality) return;
    const match =
      current && current.quality === quality ? current : { quality, genres: new Set<string>() };
    genres.forEach((g) => match.genres.add(g));
    found.set(id, match);
  }

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
      // Skip interview discs and the like that share an album's title
      if (!master || !master.genres.length || master.genres.includes("Non-Music")) continue;

      const artists = [master.artists.join(" "), ...master.artists]
        .map(normalise)
        .filter(Boolean);

      masterTitleVariants(master, artists).forEach((title, i) => {
        for (const candidate of byTitle.get(title) ?? []) {
          const pairs = candidate.artists.flatMap((a) => artists.map((b) => [a, b]));
          if (!pairs.some(([a, b]) => sameArtist(a, b))) continue;

          const titleRank = Math.max(candidate.quality, i === 0 ? 0 : 1);
          const artistRank = pairs.some(([a, b]) => a === b) ? 0 : 1;
          addMatch(candidate.id, titleRank * 2 + artistRank, master.genres);
        }
      });
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
    genresById.set(album.id, [...(found.get(album.id)?.genres ?? [])]);
  }
  return { genresById, checked: albums.length, matched: found.size };
}
