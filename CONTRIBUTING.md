# Contributing to Chipper

Thanks for helping! Chipper is a small, free, open-source project (GPL-3.0), so issues and pull requests of any size are welcome.

## Setting up

Follow steps 1–3 of [SELF_HOSTING.md](SELF_HOSTING.md), then run the dev server:

```bash
cd apps/frontend
npm run dev
```

Open http://127.0.0.1:5173. After changing anything in `apps/extension`, click the reload button on Chipper's card at `chrome://extensions`.

To work on sync, also run the server (Java 21), and start the app with `VITE_SERVER=true` so it shows sign-in. The dev server passes `/api` through to port 8080.

```bash
cd apps/backend
CHIPPER_DATA_DIR=data ./mvnw spring-boot:run
```

```bash
cd apps/frontend
VITE_SERVER=true npm run dev
```

The server's tests run with `./mvnw test` from `apps/backend`, and CI runs them too.

Grouping by topic needs the clustering service in `apps/ai` (Python 3.12). Its README covers running it and its tests; start the server with `CHIPPER_AI_URL=http://127.0.0.1:8000`.

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
| `apps/frontend/src/sync` | Signing in to the server, and the sync engine (`engine.ts`): pull, merge with the backup rules, push |
| `apps/frontend/src/topics` | Grouping by topic: the controls, the grouped list, and keeping groups in step with the server |
| `apps/backend` | The self-hosted server. `auth/` is accounts and sign-in tokens, `sync/` stores each user's records against a rising revision, `clusters/` asks the AI service to group a backlog |
| `apps/ai` | The optional clustering service (Python): embeds titles, groups them with k-means and names each group |
| `apps/extension` | The Chrome extension: `background.js` takes requests from the app, and `scripts/` reads and edits the Watch Later page |

A few things to keep in mind:

- **Changing the database shape?** Bump `DB_VERSION` in `src/db/constants.ts` and migrate existing data in `src/db/index.ts`. People's backlogs live only in their browser, so a bad migration loses them.
- **Chipper never removes music from someone's Spotify library.** Removing albums is left to the user.
- **YouTube changes its markup now and then.** The extension's selectors are all in one `SELECTORS` object at the top of `scripts/yt-wl-playlist-script.js`.
- **There are no paid features.** Chipper stays free for everyone.

## Reporting bugs

Use the bug report template on GitHub's Issues tab. If Watch Later sync breaks, say roughly how many videos you have and whether your YouTube is in English. The extension's console messages help too: open `chrome://extensions`, then click **service worker** on Chipper's card.
