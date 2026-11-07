# Chipper: An Entertainment Backlog Depleter

I would like to dedicate this project to family. Use Chipper to get through your watch laters, albums and episodes as fast as possible, so that you can spend valuable (and decluttered) time with them. Ideally, you prioritise them before your YouTube videos anyway.

Chip away at your entertainment backlog and optimise the way you consume media.

Chipper is free and open source, and always will be. It runs in your browser and keeps your data on your own machine.

## What it does

- **YouTube Watch Later**: syncs your Watch Later playlist through the Chipper browser extension (or imports it from a CSV), then lets you search, sort and filter it by duration and status, see your remaining watch time and play videos in place. Mark videos as watched, skipped or for later, then have the extension remove the ones you're done with from YouTube.
- **Spotify albums and podcasts**: connects to your Spotify account and pulls in your saved albums and saved podcast episodes. Mark albums as listening, listened or skipped, shortlist the ones you want to hear soon, and heart your favourites. Sort and filter by release date, decade, genre (from Discogs, or your own) and more. Chipper never removes anything from your Spotify library.
- **Chip sessions**: say how long you've got and which services to include, and Chipper builds one queue to fit: things you've started first, then your shortlist, then the shortest items.

## Getting started

You'll need Node.js and Chrome (or another Chromium browser).

1. **Load the extension.** Open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick `apps/extension`. Copy the extension ID it shows.
2. **Configure the frontend.** Copy `apps/frontend/.env.example` to `apps/frontend/.env`, then paste in the extension ID. For Spotify, create an app on the [Spotify developer dashboard](https://developer.spotify.com/dashboard), add `http://127.0.0.1:5173/dashboard/spotify` as a redirect URI and paste in its client ID. Spotify apps start in Development Mode, which needs the app owner to have Spotify Premium and allows up to 5 users.
3. **Run it.**

   ```bash
   cd apps/frontend
   npm install
   npm run dev
   ```

   Then open http://127.0.0.1:5173.

## Project layout

| Path | What it is |
| --- | --- |
| `apps/frontend` | The app: React, Vite and Tailwind, storing everything in IndexedDB |
| `apps/extension` | Chrome extension that reads your Watch Later playlist from YouTube |
| `apps/ai` | Experimental video clustering service (Python), planned for the self-hosted version |

## Roadmap

### Phase 0: Housekeeping

- [x] Remove the old Spring backend
- [x] Add a licence (GPL-3.0)
- [x] Add `.env.example` and getting-started instructions
- [x] Scrub the old database password from git history

### Phase 1: The shared "chip" model

- [x] Watched / skipped / deferred status for videos, recorded as video events
- [x] Line album statuses up with the same model (queued, listening, listened, later, skipped)
- [x] Persist preferences (sort, filters, thumbnails toggle, duration range) in IndexedDB

### Phase 2: YouTube Watch Later

- [x] Make sync robust: centralise selectors, refuse empty syncs, scroll until the count stops changing
- [x] Get thumbnails for every video from the video ID
- [x] Close the player without opening a new YouTube tab; mark videos watched when they end
- [x] Detect videos removed on YouTube using `lastSeenAt`
- [x] Delta sync (stop at the first known video), with full sync still available
- [x] Chip list, plus removing chipped videos from Watch Later through the extension
- [x] Import a Watch Later playlist from CSV

### Phase 3: Spotify

- [x] Detect added and removed albums; show an error when a fetch fails
- [x] Proper album card with runtime, track count and a link to Spotify
- [x] Sort by release date, artist or name; filter by decade
- [x] Listening (headphones), love (heart) and a shortlist for albums you want to hear soon
- [x] A genre filter that also shows which albums have no genre
- [x] Podcasts (saved episodes), filtered by progress and time left
- [x] Genres and styles from the Discogs masters data dump, since Spotify's artist genres are deprecated and often empty
- [x] Add, remove or reassign an album's genres yourself; later imports keep your edits

### Phase 4: The depleter

- [x] A queue across services with a time budget ("I have 40 minutes, what should I clear?"): started items first, then the shortlist, then the shortest, skipping anything that won't fit

### Phase 5: Polish and public release

- [ ] Design pass: clean up components, light and dark mode, getting-started guide on the landing page
- [ ] Self-host friendly: configurable extension ID and origins, contributor docs, issue templates
- [ ] Publish the extension (Chrome Web Store, maybe Firefox) and host the site on a domain
  - [ ] The hosted site is YouTube only: Spotify's Development Mode caps an app at 5 users, so Spotify needs your own client ID in a self-hosted copy
- [x] CI for typecheck, lint and build; tests for the import and merge logic

### Phase 6: Later, optional

- [ ] Self-hosted server with cross-device sync, Docker friendly (Jellyfin is good architectural inspiration)
  - [ ] AI clusters, available in the self-hosted version only, with a user-chosen number of groups
- [ ] Split the frontend bundle

## Licence

Chipper is licensed under the [GNU General Public License v3.0](LICENSE).
