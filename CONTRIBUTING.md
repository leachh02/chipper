# Contributing to Chipper

Thanks for helping! Chipper is a small, free, open-source project (GPL-3.0), so issues and pull requests of any size are welcome.

## Setting up

Follow steps 1–3 of [SELF_HOSTING.md](SELF_HOSTING.md), then run the dev server:

```bash
cd apps/frontend
npm run dev
```

Open http://127.0.0.1:5173. After changing anything in `apps/extension`, click the reload button on Chipper's card at `chrome://extensions`.

## Before you open a pull request

Run the same checks as CI, from `apps/frontend`:

```bash
npm run lint
npm test
npm run build
```

Add or update tests when you change how data is imported or merged (`src/db/queries.ts`), or the matching and queue logic in `src/utils`. Tests run against a fake IndexedDB, so they don't need a browser.

## How the code is laid out

| Path | What's there |
| --- | --- |
| `apps/frontend/src/pages` | One component per route |
| `apps/frontend/src/components` | Shared and per-service UI (`spotify/`) |
| `apps/frontend/src/db` | The IndexedDB schema, migrations (`index.ts`) and every read and write (`queries.ts`) |
| `apps/frontend/src/utils` | Talking to YouTube, the extension, Spotify and Discogs, and the chip session queue |
| `apps/frontend/src/config.ts` | Everything read from `.env`, with defaults |
| `apps/extension` | The Chrome extension: `background.js` takes requests from the app, and `scripts/` reads and edits the Watch Later page |

A few things to keep in mind:

- **Changing the database shape?** Bump `DB_VERSION` in `src/db/constants.ts` and migrate existing data in `src/db/index.ts`. People's backlogs live only in their browser, so a bad migration loses them.
- **Chipper never removes music from someone's Spotify library.** Removing albums is left to the user.
- **YouTube changes its markup now and then.** The extension's selectors are all in one `SELECTORS` object at the top of `scripts/yt-wl-playlist-script.js`.
- **There are no paid features.** Chipper stays free for everyone.

## Reporting bugs

Use the bug report template on GitHub's Issues tab. If Watch Later sync breaks, say roughly how many videos you have and whether your YouTube is in English. The extension's console messages help too: open `chrome://extensions`, then click **service worker** on Chipper's card.
