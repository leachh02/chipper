import { describe, expect, it } from "vitest";
import type { Album } from "../types";
import { matchDiscogsGenres, normalise, parseMaster } from "./discogs";

describe("normalise", () => {
  it.each([
    ["Siamese Dream (2011 - Remaster)", "Siamese Dream"],
    ["Rumours - 2004 Remaster", "Rumours"],
    ["Slowhand 35th Anniversary", "Slowhand"],
    ["Black Bastards Deluxe Edition", "Black Bastards"],
    ["Another Sunny Day -Remastered-", "Another Sunny Day"],
    ["Resolution - EP", "Resolution"],
    ["Exile On Main St.", "Exile On Main Street"],
    ["Nirvana (2)", "Nirvana"],
    ["Simon & Garfunkel", "Simon and Garfunkel"],
    ["A$AP Rocky", "ASAP Rocky"],
    ["Björk", "Bjork"],
    ["The Stooges", "Stooges"],
  ])("%s matches %s", (a, b) => {
    expect(normalise(a)).toBe(normalise(b));
  });

  it("keeps a title that's entirely in brackets", () => {
    expect(normalise("(Pronounced 'Lĕh-'nérd 'Skin-'nérd)")).toBe(
      normalise("Pronounced 'Leh-'Nérd 'Skin-'Nérd (Expanded Edition)"),
    );
  });
});

describe("parseMaster", () => {
  it("reads the master's title, not a video's", () => {
    const master = parseMaster(
      `<master id="1"><artists><artist><name>Blu &amp; Exile</name></artist></artists>` +
        `<genres><genre>Hip Hop</genre></genres><styles><style>Boom Bap</style></styles>` +
        `<year>2007</year><title>Below The Heavens</title>` +
        `<videos><video><title>Some Song</title></video></videos>`,
    );
    expect(master).toEqual({
      artists: ["Blu & Exile"],
      title: "Below The Heavens",
      genres: ["Hip Hop", "Boom Bap"],
    });
  });
});

const album = (id: string, artist: string, name: string) => ({ id, artist, name }) as Album;

const master = (artist: string, title: string, genres: string[]) =>
  `<master id="1"><artists><artist><name>${artist}</name></artist></artists>` +
  `<genres>${genres.map((g) => `<genre>${g}</genre>`).join("")}</genres>` +
  `<title>${title}</title></master>\n`;

async function dump(xml: string) {
  const gz = new Blob([`<masters>${xml}</masters>`]).stream().pipeThrough(new CompressionStream("gzip"));
  return new File([await new Response(gz).blob()], "discogs_20260101_masters.xml.gz");
}

describe("matchDiscogsGenres", () => {
  it("matches albums through the looser rules", async () => {
    const albums = [
      album("hendrix", "Jimi Hendrix", "Axis: Bold As Love"),
      album("eno", "Brian Eno", "Ambient 1: Music For Airports (Remastered 2004)"),
      album("sabbath", "Black Sabbath", "Vol. 4 (2021 Remaster)"),
      album("missing", "Nobody", "Nothing"),
    ];
    const file = await dump(
      master("The Jimi Hendrix Experience", "Axis: Bold As Love", ["Rock"]) +
        master("Brian Eno", "Ambient 1 (Music For Airports)", ["Electronic"]) +
        master("Black Sabbath", "Black Sabbath Vol 4", ["Rock"]),
    );

    const result = await matchDiscogsGenres(file, albums, () => {});
    expect(result.matched).toBe(3);
    expect(Object.fromEntries(result.genresById)).toEqual({
      hendrix: ["Rock"],
      eno: ["Electronic"],
      sabbath: ["Rock"],
      missing: [],
    });
  });

  it("prefers an exact artist over a looser one", async () => {
    const file = await dump(
      master("Queen", "Greatest Hits", ["Rock"]) +
        master("Queensryche", "Greatest Hits", ["Heavy Metal"]),
    );
    const result = await matchDiscogsGenres(file, [album("q", "Queen", "Greatest Hits")], () => {});
    expect(result.genresById.get("q")).toEqual(["Rock"]);
  });

  it("skips interview discs that share a title", async () => {
    const file = await dump(
      master("Nirvana", "Nevermind", ["Rock"]) + master("Nirvana", "Nevermind", ["Non-Music"]),
    );
    const result = await matchDiscogsGenres(file, [album("n", "Nirvana", "Nevermind")], () => {});
    expect(result.genresById.get("n")).toEqual(["Rock"]);
  });

  it("rejects a file that isn't a masters dump", async () => {
    const file = new File(["hello"], "notes.xml");
    await expect(matchDiscogsGenres(file, [], () => {})).rejects.toThrow(/Discogs masters file/);
  });
});
